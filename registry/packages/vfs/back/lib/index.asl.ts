import { yieldExecution } from "common/lib/async.asl";
import { fileStat } from "common/lib/file.asl";
import type { Dirent, Stats } from "fs";
import File from "fs/promises";
import type Http from "http";
import Path from "path";
import { app } from "rapid";
import VfsPath from "vfs/lib/path.asl";
import { Drive, DriveFileSystem } from "../app/drive.asl";
import { PathLockHandle, PathLockManager, PathLockRequest } from "../app/pathlock.asl";
import { drives, getDrive, pathLocks } from "../app/state.asl";

import * as DriveNS from "../app/drive.asl";
import * as PathLockNs from "../app/pathlock.asl";

function getMtime(stat?: Stats): number {
    if (stat === undefined) return Math.floor(Date.now());
    else return Math.floor(stat.mtimeMs);
}

export namespace Vfs {
    export import VfsErrorCode = DriveNS.VfsErrorCode;
    export import VfsError = DriveNS.VfsError;
    export import VfsNode = DriveNS.VfsNode;
    export import VfsNodeType = DriveNS.VfsNodeType;
    export import VfsPermissions = DriveNS.VfsPermissions;

    export import LockType = PathLockNs.LockType;
    export import ShareType = PathLockNs.ShareType; 

    export import LockOptions = PathLockNs.PathLockOptions;
    
    export type SortOptions = { [k in typeof DriveFileSystem["VALID_COLUMN_NAMES"][number]]?: typeof DriveFileSystem["VALID_ORDER"][number] };

    export const ctx = PathLockManager.ctx;

    /**
     * Mounts a given VFS
     * 
     * @param driveName 
     * @param path 
     * @param physicalPath 
     * @returns 
     */
    export async function mount(driveName: string, path: string, physicalPath: string, permissions: VfsPermissions) {
        const first = VfsPath.first(driveName);
        if (!first) throw new Error("No drive was found");
        driveName = driveName.slice(first.start, first.end);

        let drive = drives.get(driveName);
        if (drive === undefined) {
            await File.mkdir(physicalPath, { recursive: true });
            drive = new Drive(driveName, path, physicalPath, permissions);
            drives.set(driveName, drive);
        }
        if (drive.physicalPath !== Path.resolve(physicalPath)) {
            throw new Error("A different drive already exists with the given drive name.");
        }
        drive.permissions = permissions;
    }

    export function tryAcquire(locks: PathLockRequest[]) {
        return pathLocks.tryAcquire(locks);
    }

    export function acquire(locks: PathLockRequest[]) {
        return pathLocks.acquire(locks);
    }

    export function release(handles: PathLockHandle, key?: any) {
        handles.release(key);
    }

    export function withLocks<T>(locks: PathLockRequest[], cb: (handle: PathLockHandle) => T | Promise<T>, abortController?: AbortController) {
        return pathLocks.withLocks<T>(locks, cb, abortController);
    }

    async function _remapEntry(drive: Drive, dir: string, parent: VfsNode, entry: Dirent<string>, ctx: any) {
        const fs = drive.fs;
        const drivePath = Path.join(dir, entry.name);
        
        const path = VfsPath.join(drive.name, drivePath);
        return pathLocks.withLocks([
            { key: "delete", path: path, type: LockType.Delete, share: ShareType.SharedDelete, depth: -1, ctx },
            { path: path, type: LockType.Any, share: ShareType.SharedReadWrite, ctx }
        ], async (handle) => {
            const stat = await File.stat(drivePath);
            const mtime = getMtime(stat);

            // Remove old node
            const current = fs.findChild(parent.id, entry.name);
            if (current) fs.delete(current.id);

            handle.release("delete");

            // Create new node
            if (entry.isDirectory()) {
                const node = fs.insert(entry.name, "directory", parent.id, mtime, null)!;
                await _remap(drive, drivePath, node, ctx);
            } else if (entry.isFile()) {
                fs.insert(entry.name, "file", parent.id, mtime, stat.size);
            }
        });
    }

    async function _remap(drive: Drive, dir: string, parent: VfsNode, ctx: any) {
        const entries = await File.readdir(dir, { withFileTypes: true });
        
        const jobs = [];
        for (const entry of entries) {
            jobs.push(_remapEntry(drive, dir, parent, entry, ctx));
            
            // If there are many entries, pushing all the jobs can take a long time,
            // and as this is a synchronous operation, this can cause the main thread to hang.
            //
            // We yield to allow other tasks to run in between.
            await yieldExecution();
        }
        await Promise.all(jobs);
    }

    /**
     * Remaps the VFS to match the given disk structure
     * NOTE(randomuserhi): Can introduce security issues if disk has symlinks etc...
     */
    export async function remap(path: string, opt?: LockOptions) {
        const { drive, drivePath } = getDrive(path);
        const fs = drive.fs;
        
        const physicalPath = drive.getPhysicalPath(drivePath);
        
        const ctx = PathLockManager.ctx(opt);
        return pathLocks.withLocks([
            { key: "delete", path, type: LockType.Delete, share: ShareType.SharedDelete, depth: -1, ctx },
            { path, type: LockType.Any, share: ShareType.SharedReadWrite, ctx }
        ], async (handle) => {    
            const node = fs.resolve(drivePath);
            if (node?.id === DriveFileSystem.ROOT_NODE_ID) {
                // Fast path for full drive remap
                fs.deleteChildren(DriveFileSystem.ROOT_NODE_ID);
                handle.release("delete");
                        
                await _remap(drive, physicalPath, DriveFileSystem.ROOT_NODE, ctx);
                return;
            } else if (node !== undefined) {
                fs.delete(node.id);
                handle.release("delete");
            }

            const stat = await fileStat(physicalPath);
            if (stat !== undefined) {
                const isDirectory = stat.isDirectory();
                const isFile = stat.isFile();
                const dirNode = await mkdir(isDirectory ? path : VfsPath.dirname(path), { ctx });

                if (isDirectory) {
                    await _remap(drive, physicalPath, dirNode, ctx);
                } else if (isFile) {
                    fs.insert(VfsPath.slice(VfsPath.last, drivePath), "file", dirNode.id, getMtime(stat), stat.size);
                } else {
                    throw new VfsError("InvalidOperation", "Cannot remap an entry that is not a file or directory.");
                }
            }
        });
    }

    /**
     * Resolves a path to its physical path on disk
     */
    export function resolve(path: string, opt?: { verify?: boolean } & LockOptions) {
        const { drive, drivePath } = getDrive(path);
        const fs = drive.fs;

        const ctx = PathLockManager.ctx(opt);
        return withLocks([
            { path, type: LockType.Read, share: ShareType.SharedReadWrite, ctx }
        ], () => {
            if (opt?.verify === undefined || opt?.verify) {
                const node = fs.resolve(drivePath);
                if (node === undefined) throw new VfsError("FileNotFound", "Could not find target path");
            }
            return drive.getPhysicalPath(drivePath);
        });
    }

    /**
     * Recursively creates directories in the given path
     * 
     * @param path 
     * @returns 
     */
    export function mkdir(path: string, opt?: LockOptions) {
        // Lock directories along path to prevent deletion during mkdir operation
        const ctx = PathLockManager.ctx(opt);
        const locks: PathLockRequest[] = [];
        {
            const stack: string[] = [];
            for (const part of VfsPath.walk(path)) {
                stack.push(part); 
                locks.push({ path: stack.join("/"), type: LockType.Any, share: ShareType.SharedReadWrite, ctx });
            }
        }
        return withLocks(locks, async () => {
            const { drive, drivePath } = getDrive(path);
            const fs = drive.fs;
            
            const mtime = getMtime();

            let topLevelCreated: string | undefined = undefined;
            let parent: VfsNode = DriveFileSystem.ROOT_NODE;
            for (const { part, full } of VfsPath.walk(drivePath, 0, true)) {
                if (parent.type !== "directory") throw new VfsError("TraversalError", "Cannot traverse into a file.");
                if (part === ".") continue;
                if (part === "..") {
                    if (parent.id === DriveFileSystem.ROOT_NODE_ID) throw new VfsError("TraversalError", "Cannot traverse outside of root.");
                    if (!parent.parent_id) throw new VfsError("TraversalError", "This node has no parent.");
                            
                    const node = fs.get(parent.parent_id);
                    if (!node) throw new VfsError("TraversalError", "Could not find parent node.");
                    parent = node;
                            
                    continue;
                }
            
                let node = fs.findChild(parent.id, part);
                if (!node) {
                    node = fs.insert(part, "directory", parent.id, mtime, null)!;
                    if (topLevelCreated === undefined) topLevelCreated = full;
                }
            
                parent = node;
            }
            
            try {
                await File.mkdir(drive.getPhysicalPath(drivePath), { recursive: true });
            } catch (err) {
                if (topLevelCreated !== undefined) {
                    await remap(drive.toGlobalPath(topLevelCreated), { ctx });
                }
                throw err;
            }
            
            return parent;
        });
    }

    /**
     * Converts VFS path to path on disk to perform write operations.
     * 
     * Throws `InvalidOperation` if overwriting a directory
     * Throws `TraversalError` if unable to find write location
     * 
     * @param path 
     * @returns 
     */
    export async function writeFile(path: string, write: (path: string) => Promise<void>, opt?: LockOptions) {
        return withLocks([
            { path, type: LockType.Write, share: ShareType.SharedRead, ctx: opt?.ctx }
        ], async () => {
            const { drive, drivePath } = getDrive(path);
            const fs = drive.fs;

            const fileSlice = VfsPath.last(drivePath, 0, false);
            if (!fileSlice) throw new VfsError("InvalidOperation", "No filename was provided."); 
    
            const filename = drivePath.slice(fileSlice.start, fileSlice.end);
            const dirPath = drivePath.slice(0, fileSlice.start);
    
            const parent = fs.resolve(dirPath);
            if (!parent) {
                throw new VfsError("TraversalError", "Could not find parent directory to place file in.");
            } else if (parent.type !== "directory") {
                throw new VfsError("TraversalError", "Cannot traverse into a file.");
            }
    
            const mtime = getMtime();
            let node = fs.findChild(parent.id, filename);
            if (node?.type === "directory") throw new VfsError("InvalidOperation", "Cannot write over a directory.");
            if (node === undefined) {
                node = fs.insert(filename, "file", parent.id, mtime, 0)!;
            }
    
            const physicalPath = drive.getPhysicalPath(drivePath);
            const result = await write(physicalPath);
    
            const stat = await fileStat(physicalPath);
            if (stat !== undefined) {
                fs.setSize(stat.size, node.id);
            }

            return result;
        });
    }

    /**
     * Converts VFS path to path on disk to perform read operations
     * 
     * Throws `FileNotFound` if file does not exist
     * 
     * @param path 
     * @returns 
     */
    export async function readFile<T>(path: string, read: (path: string, node: VfsNode) => T | Promise<T>, opt?: LockOptions) {
        return withLocks([
            { path, type: LockType.Read, share: ShareType.SharedReadWrite, ctx: opt?.ctx }
        ], async () => {
            const { drive, drivePath } = getDrive(path);
            const fs = drive.fs;

            const node = fs.resolve(drivePath);
            if (node === undefined) throw new VfsError("FileNotFound", `File '${path}' Not found`);
    
            return await read(drive.getPhysicalPath(drivePath), node);
        });
    }

    /**
     * List all directories in a given path
     * 
     * Throws `DirectoryNotFound` if directory is not found
     * Throws `InvalidOperation` if given path is not a directory
     * 
     * @param path 
     * @returns 
     */
    export function listDir(path: string, opt?: LockOptions & { sort?: SortOptions, pagination: undefined }): Promise<VfsNode[]>
    export function listDir(path: string, opt?: LockOptions & { sort?: SortOptions, pagination: { page: number, limit: number } }): Promise<{ entries: VfsNode[], page: number, totalPages: number, totalEntries: number }>
    export function listDir(path: string, opt?: LockOptions & { sort?: SortOptions, pagination?: { page: number, limit: number } }): Promise<VfsNode[] | { entries: VfsNode[], page: number, totalPages: number, totalEntries: number }>
    export function listDir(path: string, opt?: LockOptions & { sort?: SortOptions, pagination?: { page: number, limit: number } }) {
        // Lock directory being listed to prevent it getting deleted during list
        return withLocks([
            { path, type: LockType.Any, share: ShareType.SharedReadWrite, ctx: opt?.ctx }
        ], async () => {
            if (path.length === 0 || path === "/" || path === ".") {
                const entries: VfsNode[] = [];

                for (const name of drives.keys()) {
                    entries.push({
                        name,
                        id: 1,
                        type: "directory",
                        parent_id: null,
                        mtime: null,
                        size: null
                    });
                }
                
                return entries;
            }

            const { drive, drivePath } = getDrive(path);
            const fs = drive.fs;

            const node = fs.resolve(drivePath);
            if (!node) {
                throw new VfsError("DirectoryNotFound", "Directory does not exist.");
            }
    
            if (!node || node.type !== "directory") {
                throw new VfsError("InvalidOperation", "Not a directory");
            }
    
            if (opt?.sort === undefined) {
                if (opt?.pagination === undefined) {
                    return fs.list(node.id);
                } else {
                    const totalEntries = fs.childCount(node.id);
                    return { 
                        entries: fs.limitList(node.id, opt.pagination.limit, opt.pagination.page * opt.pagination.limit),
                        page: opt.pagination.page,
                        totalPages: Math.ceil(totalEntries / opt.pagination.limit),
                        totalEntries
                    };
                }
            } else {
                const sort = opt?.sort;
                const pagination = opt?.pagination;
                const orderBy: string[] = [];
                for (const _column in sort) {
                    const column = _column as keyof typeof sort;
                    const order = sort[column];
                        
                    if (order === undefined) continue;
                    if (!DriveFileSystem.VALID_COLUMN_NAMES.includes(column)) continue;
                    if (!DriveFileSystem.VALID_ORDER.includes(order)) continue;
                        
                    orderBy.push(`${column} ${order}`);
                }
                const entries = fs.db.prepare<[id: number], VfsNode>(`
                        SELECT * FROM nodes WHERE parent_id = ? ${orderBy.length > 0 ? `ORDER BY ${orderBy.join(",")}` : ""} ${pagination ? `LIMIT ${pagination.limit} OFFSET ${pagination.page * pagination.limit}` : ""}
                        `).all(node.id);
                    
                if (pagination === undefined) return entries;
                else {
                    const totalEntries = fs.childCount(node.id);
                    return {
                        entries,
                        page: pagination.page,
                        totalPages: Math.ceil(totalEntries / pagination.limit),
                        totalEntries
                    };
                }
            }
        });
    }

    /**
     * Equivalent to `fs.stat` except returns undefined on file not exist
     * 
     * @param path 
     * @returns 
     */
    export async function stat(path: string, opt?: LockOptions) {
        // Lock entry to prevent it being deleted
        return withLocks([
            { path, type: LockType.Any, share: ShareType.SharedReadWrite, ctx: opt?.ctx }
        ], async () => {
            const { drive, drivePath } = getDrive(path);
            const fs = drive.fs;

            const node = fs.resolve(drivePath);
            if (node === undefined) return undefined;

            const stat = await fileStat(drive.getPhysicalPath(drivePath));
            if (stat !== undefined) {
                fs.setMeta(getMtime(stat), stat.size, node.id);
            }
            return stat;
        });
    }

    /**
     * Deletes a given directory or file
     * 
     * Throws `PathNotFound` if the path does not exist
     * Throws `InvalidOperation` if trying to delete root
     * 
     * @param path 
     * @returns 
     */
    export async function rm(path: string, opt?: LockOptions) {
        const ctx = PathLockManager.ctx(opt);
        return withLocks([
            { path, type: LockType.Delete, share: ShareType.SharedDelete, depth: -1, ctx }
        ], async () => {
            const { drive, drivePath } = getDrive(path);
            const fs = drive.fs;

            const node = fs.resolve(drivePath);
            if (!node) {
                throw new VfsError("PathNotFound", "Path does not exist");
            }
            
            // Protect root node
            if (node.id === DriveFileSystem.ROOT_NODE_ID) {
                throw new VfsError("InvalidOperation", "Cannot delete root");
            }
            
            try {
                await File.rm(drive.getPhysicalPath(drivePath), { recursive: true });
            } catch(err) {
                await remap(path, { ctx });
                throw err;
            }
        
            fs.delete(node.id);
        });
    }

    export async function rename(src: string, dest: string, opt?: LockOptions) {
        const ctx = PathLockManager.ctx(opt);
        return withLocks([
            { path: src, type: LockType.Delete, share: ShareType.SharedDelete, depth: -1, ctx },
            { path: dest, type: LockType.Write, share: ShareType.SharedRead, depth: -1, ctx }
        ], async () => {
            const { drive: srcDrive, drivePath: srcDrivePath } = getDrive(src);
            const srcFs = srcDrive.fs;
            const { drive: destDrive, drivePath: destDrivePath } = getDrive(dest);
            const destFs = destDrive.fs;

            const mtime = getMtime();
            
            const node = srcFs.resolve(srcDrivePath);
            if (!node) throw new VfsError("PathNotFound", "Source not found");
            
            if (node.id === DriveFileSystem.ROOT_NODE_ID) {
                throw new VfsError("InvalidOperation", "Cannot move root");
            }
            
            if (await destDrive.fs.resolve(destDrivePath) !== undefined) {
                throw new VfsError("InvalidOperation", "Destination exists already.");
            }
            
            const fileSlice = VfsPath.last(destDrivePath, 0, false);
            if (fileSlice === undefined) throw new VfsError("InvalidOperation", "No destination specified");
            const newName = destDrivePath.slice(fileSlice.start, fileSlice.end);
            const destDir = destDrivePath.slice(0, fileSlice.start);
            
            const destDirNode = await destFs.resolve(destDir);
            if (!destDirNode) {
                throw new VfsError("DirectoryNotFound", "Cannot find destination directory");
            } else if (destDirNode.type !== "directory") {
                throw new VfsError("InvalidOperation", "Destination was not a directory");
            }
            
            node.name = newName;
            
            const sameDrive = destDrive === srcDrive;
            if (sameDrive && srcFs.isDescendant(node.id, destDirNode.id)) {
                // If same drive, we need to check descendent
                throw new VfsError("InvalidOperation", "Cannot move a directory into its own subtree");
            }

            try {
                await File.rename(srcDrive.getPhysicalPath(srcDrivePath), destDrive.getPhysicalPath(destDrivePath));
            } catch(err) {
                await remap(src, { ctx });
                await remap(dest, { ctx });
                throw err;
            }
            
            if (sameDrive) {
                // Fast path for same drive
                srcFs.moveAndRename(newName, destDirNode.id, mtime, node.id);
            } else {
                destFs.insertTree(destDirNode.id, node, srcFs.tree(node.id), mtime);
                srcFs.delete(node.id);
            }
        });
    }

    export async function copy(src: string, dest: string, opt?: LockOptions) {
        const ctx = PathLockManager.ctx(opt);
        return withLocks([
            { path: src, type: LockType.Read, share: ShareType.SharedRead, depth: -1, ctx },
            { path: dest, type: LockType.Write, share: ShareType.SharedRead, depth: -1, ctx }
        ], async () => {
            const { drive: srcDrive, drivePath: srcDrivePath } = getDrive(src);
            const srcFs = srcDrive.fs;
            const { drive: destDrive, drivePath: destDrivePath } = getDrive(dest);
            const destFs = destDrive.fs;

            const mtime = getMtime();
            
            const node = srcFs.resolve(srcDrivePath);
            if (!node) throw new VfsError("PathNotFound", "Source not found");
            
            if (node.id === DriveFileSystem.ROOT_NODE_ID) {
                throw new VfsError("InvalidOperation", "Cannot copy root");
            }
            
            const destNode = await destFs.resolve(destDrivePath);
            if (destNode !== undefined) {
                if (destDrive === srcDrive && destNode.id === node.id) {
                    // Fast path, same node
                    return;
                } else if (destNode.type !== node.type) {
                    throw new VfsError("InvalidOperation", "Cannot merge a file with a directory or vice versa.");
                }
            }
            
            const fileSlice = VfsPath.last(destDrivePath, 0, false);
            if (fileSlice === undefined) throw new VfsError("InvalidOperation", "No destination specified");
            const newName = destDrivePath.slice(fileSlice.start, fileSlice.end);
            const destDir = destDrivePath.slice(0, fileSlice.start);
            
            const destDirNode = await destFs.resolve(destDir);
            if (!destDirNode) {
                throw new VfsError("DirectoryNotFound", "Cannot find destination directory");
            } else if (destDirNode.type !== "directory") {
                throw new VfsError("InvalidOperation", "Destination was not a directory");
            }
            
            node.name = newName;

            if (destDrive === srcDrive && srcFs.isDescendant(node.id, destDirNode.id)) {
                // If same drive, we need to check descendent
                throw new VfsError("InvalidOperation", "Cannot move a directory into its own subtree");
            }
            
            try {
                await File.cp(srcDrive.getPhysicalPath(srcDrivePath), destDrive.getPhysicalPath(destDrivePath), { recursive: true });
            } catch(err) {
                await remap(dest, { ctx });
                throw err;
            }
            
            destFs.insertTree(destDirNode.id, node, srcFs.tree(node.id), mtime);
        });
    }

    /**
     * Serves a resource via a VFS path
     * 
     * @param path 
     * @param res 
     * @returns 
     */
    export async function serve(path: string, res: Http.ServerResponse) {
        const { drive, drivePath } = getDrive(path);
        const fs = drive.fs;
        
        const node = fs.resolve(drivePath);
        const physicalPath = node ? drive.getPhysicalPath(drivePath) : undefined;
        if (physicalPath === undefined) {
            res.statusCode = 404;
            res.end("File not found.");
            return;
        }

        await app.serve(physicalPath, res);
    }

    export function checkDrivePermissions(path: string, action: "Read" | "Write"): boolean {
        const { drive } = getDrive(path);
        if (drive.permissions === "ReadOnly") {
            return action === "Read";
        } else if (drive.permissions === "WriteOnly") {
            return action === "Write";
        }

        return true;
    }
}

export default Vfs;