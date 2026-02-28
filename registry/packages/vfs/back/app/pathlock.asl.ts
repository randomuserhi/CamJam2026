import VfsPath from "vfs/lib/path.asl";
import { hasFlag } from "common/lib/bit.asl";

export interface PathLockOptions {
    ctx?: any[];
}

export const enum LockType {
    Any       = 0,

    Read      = 1 << 1,
    Write     = 1 << 2,
    Delete    = 1 << 3,

    ReadWrite = Read | Write
}

export const enum ShareType {
    Any          = 0,

    Exclusive    = 1 << 0,

    SharedRead   = 1 << 1,
    SharedWrite  = 1 << 2,
    SharedDelete = 1 << 3,

    SharedReadWrite = SharedRead | SharedWrite
}

export interface PathLockRequest {
    path: string;
    type: LockType;
    share: ShareType;
    depth?: number; // default: 0, -1 means entire subtree
    ctx?: any[];
    key?: any;
}

/**
 * A lock on a given path
 */
class PathLock {
    path: string = undefined!;
    type: LockType = undefined!;
    share: ShareType = undefined!;
    depth: number = undefined!;
    ctx: any[] = undefined!;
    refCount: number = undefined!;

    constructor(req: PathLockRequest) {
        this.set(req);
    }

    public set(req: PathLockRequest) {
        this.path = req.path;
        this.share = req.share;
        this.type = req.type;
        this.depth = req.depth ?? 0;
        this.ctx = req.ctx ?? [{}];
        this.refCount = 0;
    }

    /**
     * Checks if the requested lock matches this lock instance.
     * 
     * @param lock 
     * @returns 
     */
    public equal(lock: PathLockRequest) {
        const depth = lock.depth ?? 0;
        let sameContext = this.ctx === lock.ctx;
        if (!sameContext && this.ctx.length === lock.ctx?.length) {
            sameContext = true;
            for (let i = 0; i < this.ctx.length; ++i) {
                if (this.ctx[i] !== lock.ctx[i]) {
                    sameContext = false; 
                    break;
                }
            }

            // If context is the same, set the requesting lock's context
            // to the same array object to take fast path later
            if (sameContext) lock.ctx = this.ctx;
        }
        return this.path === lock.path && 
            this.type === lock.type && 
            this.share === lock.share && 
            this.depth === depth &&
            sameContext;
    }

    /**
     * Checks if the given requested lock type conflicts this lock instance's type.
     * 
     * @param lock 
     * @returns 
     */
    public conflicts(lock: PathLockRequest) {
        // Any shares never conflicy
        if (this.share === ShareType.Any ||
            lock.share === ShareType.Any) return false;

        // Exclusive shares always conflict
        if (this.share === ShareType.Exclusive ||
            lock.share === ShareType.Exclusive) return true;

        // Conflict if either lock share options do not permit each others lock type
        return !hasFlag(this.share, lock.type) || !hasFlag(lock.share, this.type);
    }

    /**
     * Checks if the given requested lock's path overlaps with this lock instance.
     * 
     * @param lock 
     * @returns 
     */
    public overlap(lock: PathLockRequest) {
        // Check lock context to see if we allow reentrance
        if (this.ctx === lock.ctx) return false; // Fast path when same array object is used
        if (lock.ctx !== undefined) {
            let reentrant = true;
            for (let i = 0; i < this.ctx.length && i < lock.ctx.length; ++i) {
                if (this.ctx[i] !== lock.ctx[i]) {
                    reentrant = false;
                    break;
                }
            }
            if (reentrant) return false;
        }

        // Check if locks overlap
        const lockDepth = lock.depth ?? 0;

        // Fast path for direct lock
        if (this.depth === 0 && lockDepth === 0) {
            return lock.path === this.path;
        }

        // Fast path for equality
        if (lock.path === this.path) {
            return true;
        }

        // Slow path to check depth
        {
            const AWalk = VfsPath.walk(this.path);
            const BWalk = VfsPath.walk(lock.path);
            
            let A = AWalk.next();
            let B = BWalk.next();
            while(!A.done && !B.done) {
                if (A.value !== B.value) return false; // Paths do not overlap
                A = AWalk.next();
                B = BWalk.next();
            }
            
            let depth = 0;

            if (!A.done || !B.done) {
                const cont = A.done ? BWalk : AWalk;
                let it: IteratorResult<string, void>;
                do {
                    ++depth;
                    it = cont.next();
                } while (!it.done);

                return A.done 
                    ? this.depth === -1 ? true : depth <= this.depth 
                    : lockDepth === -1 ? true : depth <= lockDepth;
            }

            throw new Error("Unreachable");
        }
    }
}

/**
 * A handle to a set of path locks obtained
 */
export class PathLockHandle {
    public static readonly EMPTY: PathLockHandle = new PathLockHandle(undefined, undefined); 

    public locks: Set<PathLock> | undefined;
    public map: Map<any, PathLock> | undefined;
    public owner: PathLockManager | undefined;

    constructor(owner: PathLockManager | undefined, locks: Set<PathLock> | undefined, map?: Map<any, PathLock>) {
        this.owner = owner;
        this.locks = locks;
        this.map = map;
    }

    public release(key?: any) {
        this.owner?.release(this, key);
    }
}

/**
 * Manages path locks for file operations.
 * 
 * Allows locking of paths for shared (read) or exclusive (write) access.
 */
export class PathLockManager {
    private activeLocks = new Set<PathLock>();
    private pending = new Set<{ locks: PathLockRequest[]; resolve: (handle: PathLockHandle) => void; }>();
    private _pending = new Set<{ locks: PathLockRequest[]; resolve: (locks: PathLockHandle) => void; }>();

    /** Book keeping for acquired lock handles */
    public handles = new Set<PathLockHandle>();

    /**
     * Generates a unique context.
     * If given a parent context, will generate a unique context under the parent.
     * @param opt 
     */
    public static ctx(opt?: PathLockOptions) {
        const ctx: any[] = [];
        if (opt?.ctx !== undefined) {
            ctx.push(...opt.ctx);
        }
        ctx.push(Symbol("PathLock.Ctx"));
        return ctx;
    }

    private normalizePath(path: string) {
        if (!path.startsWith("/")) path = "/" + path;
        path = VfsPath.normalize(path, false);
        return path;
    }

    private static DUMMY: PathLock = new PathLock({ path: "", type: LockType.Any, share: ShareType.Any });
    private normalize(locks: PathLockRequest[]): PathLockRequest[] {
        const l = PathLockManager.DUMMY;
        
        // Normalize and copy locks
        for (const lock of locks) {
            lock.path = this.normalizePath(lock.path);
        }
        const normalizedLocks: PathLockRequest[] = [];
        for (let i = 0; i < locks.length; ++i) {
            const lock = locks[i];

            let duplicateLock = false;
            for (let j = i + 1; j < locks.length; ++j) {
                const _l = locks[j];

                l.set(_l);
                if (l.overlap(lock) && l.conflicts(lock)) {
                    throw new Error("Lock group causes a deadlock.");
                }

                if (l.equal(lock)) {
                    duplicateLock = true;
                    break;
                }
            }

            if (!duplicateLock) {
                normalizedLocks.push(lock);
            }
        }

        return normalizedLocks;
    }

    /**
     * Releases handle
     * 
     * @param handle
     * @returns 
     */
    public release(handle: PathLockHandle, key?: any) {
        // Check handle wasn't already released
        // TODO(randomuserhi): consider checking this.handles for if it contains the handle object ?
        if (handle.locks === undefined) return;
        if (handle.owner !== this) return;

        let dirty = false;

        if (key === undefined) {
            for (const lock of handle.locks) {
                if (--lock.refCount === 0) {
                    this.activeLocks.delete(lock);
                    dirty = true;
                }
            }

            // Clear handle references
            handle.locks = undefined;
            this.handles.delete(handle);
        } else {
            const lock = handle.map?.get(key);
            if (lock !== undefined && --lock.refCount === 0) {
                this.activeLocks.delete(lock);
                dirty = true;
            }

            handle.map?.delete(key);
            if (handle.map?.size === 0) {
                handle.map = undefined;
            }

            handle.locks.delete(lock!);
            if (handle.locks.size === 0) {
                handle.locks = undefined;
            }
        }

        if (!dirty) return;

        // Only check if we can acquire new locks if we cleared out an existing one
        this.update();
    }

    private update() {
        for (const pending of this.pending) {
            const handle = this._tryAcquire(pending.locks);
            if (handle !== undefined) {
                // Submit handle (resolve the `acquire` promise waiting for the requested locks)
                pending.resolve(handle);
            } else {
                // Requeue request
                this._pending.add(pending);
            }
        }
        this.pending.clear();

        const temp = this.pending;
        this.pending = this._pending;
        this._pending = temp;
    }

    private _tryAcquire(locks: PathLockRequest[]): PathLockHandle | undefined {
        const acquiredLocks = new Set<PathLock>();
        let map: Map<any, PathLock> | undefined;

        const register = (newLock: PathLock, key?: any) => {
            acquiredLocks.add(newLock);
            if (key !== undefined) {
                if (map === undefined) map = new Map();
                if (map.has(key)) throw new Error("Cannot have multiple locks with the same key.");
                map.set(key, newLock);
            }
        };

        for (const lock of locks) {
            if (this.activeLocks.size === 0) {
                const newLock = new PathLock(lock);
                register(newLock, lock.key);
            } else {
                let createLock = true;
                for (const l of this.activeLocks) {
                    if (l.overlap(lock) && l.conflicts(lock)) {
                        // Cannot acquire lock, it conflicts with an existing
                        return undefined;
                    }
                    
                    if (l.equal(lock)) {
                        // Found a matching lock, don't create a new one
                        register(l, lock.key);
                        createLock = false;
                        break;
                    }
                }

                if (createLock) {
                    const newLock = new PathLock(lock);
                    register(newLock, lock.key);
                }
            }
        }

        if (acquiredLocks.size === 0) return undefined;

        // Bump ref counts and add new locks
        for (const lock of acquiredLocks) {
            ++lock.refCount;
            this.activeLocks.add(lock);
        }

        const handle = new PathLockHandle(this, acquiredLocks, map);
        // Track acquired handle
        this.handles.add(handle);
        return handle;
    }

    /**
     * Try to acquire all given lock requests.
     * 
     * @param locks 
     * @returns 
     */
    public tryAcquire(locks: PathLockRequest[]) {
        locks = this.normalize(locks);
        return this._tryAcquire(locks);
    }

    /**
     * Acquire a set of locks. 
     * The list of locks are acquired in a single atomic transaction, and thus cannot deadlock even if there is a cycle in the provided list.
     * 
     * @param locks 
     * @returns 
     */
    public acquire(locks: PathLockRequest[]) {
        if (locks.length === 0) return Promise.resolve<PathLockHandle>(PathLockHandle.EMPTY);

        locks = this.normalize(locks);

        return new Promise<PathLockHandle>((resolve) => {
            this.pending.add({
                locks,
                resolve
            });
            this.update();
        });
    }

    /**
     * Executes the given call back when the requested locks are acquired.
     * Automatically releases the locks after callback is ran.
     * 
     * @param locks 
     * @param cb 
     * @returns 
     */
    public async withLocks<T>(locks: PathLockRequest[], cb: (handle: PathLockHandle) => T | Promise<T>, abortController?: AbortController) {
        const handle = await this.acquire(locks);

        try {
            if (abortController?.signal.aborted) {
                // TODO(randomuserhi): Custom error class
                throw new Error("Operation Cancelled.");
            }
            return await cb(handle);
        } finally {
            this.release(handle);
        }
    }
}