import { onProcessExit } from "rapid";
import VfsPath from "vfs/lib/path.asl";
import { Drive } from "./drive.asl";
import { PathLockManager } from "./pathlock.asl";

export const drives = new Map<string, Drive>();
export const pathLocks = new PathLockManager();

/**
 * Obtains the individual VFS drive
 * 
 * @param path 
 * @returns 
 */
export function getDrive(path: string): { drive: Drive, drivePath: string } {
    path = VfsPath.normalize(path, false);

    const first = VfsPath.first(path);
    if (!first) throw new Error("No drive was found");

    const driveName = path.slice(first.start, first.end);
    if (driveName === "." || driveName === "..") throw new Error("Traversal file paths are not allowed");

    const drive = drives.get(driveName);
    if (!drive) throw new Error(`Could not find drive '${driveName}'`);

    path = path.slice(first.end);
    if (!path.startsWith("/")) path = "/" + path;

    return { drive, drivePath: path };
}

function dispose() {
    for (const drive of drives.values()) {
        drive.dispose();
    }

    drives.clear();
}

__ASL.onAbort(() => {
    dispose();
});

onProcessExit(dispose, { signal: __ASL.signal });