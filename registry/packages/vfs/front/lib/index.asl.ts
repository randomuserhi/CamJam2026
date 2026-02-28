import { encodeBase64 } from "common/lib/bit.asl";

// TODO(randomuserhi): Better error messages for debugging
// TODO(randomuserhi): API for acquiring and releasing path locks
// TODO(randomuserhi): Code cleanup + better documentation

export namespace Vfs {
    export type VfsNodeType = "file" | "directory";
    export interface VfsNode {
        id: number;
        parent_id: number | null;
        type: VfsNodeType;
        name: string;
        mtime: number | null;
        size: number | null;
    }

    export type SortOptions = { [k in "name" | "size" | "type" | "mtime"]?: "ASC" | "DESC" }

    let _ws: WebSocket | undefined = undefined;
    /** Creates a websocket connection to Vfs package if one does not exist already. */
    function ws() {
        return new Promise<WebSocket>((resolve, reject) => {
            let ws = _ws;
            if (ws === undefined || ws.readyState === ws.CLOSED) {
                ws = new WebSocket(`ws://${window.location.host}/vfs`);
                _ws = ws;
            }

            if (ws.readyState === ws.OPEN) {
                // Socket was already ready
                resolve(ws);
                return;
            }

            // Wait for socket to connect (reject on close)

            const dispose = () => {
                ws.removeEventListener("open", open);
                ws.removeEventListener("close", close);
            };

            const close = () => {
                reject(new Error("Web socket closed prior task completion."));
                dispose();
            };

            const open = () => {
                resolve(ws);
                dispose();
            };

            ws.addEventListener("open", open);
            ws.addEventListener("close", close);
        });
    }

    /** Waits for task success message from VFS websocket. */
    async function taskConfirm(task: (taskId: number) => Promise<Response>) {
        const _ws = await ws();

        const resp = await fetch(`/vfs/api/taskId`, { method: "GET" });
        if (!resp.ok) throw new Error("Failed to get VFS task Id.");
        const taskId = (await resp.json()).taskId;

        return new Promise<void>((resolve, reject) => {
            const dispose = () => {
                _ws.removeEventListener("message", message);
                _ws.removeEventListener("close", close);
            };

            const close = () => {
                reject(new Error("Web socket closed prior task completion."));
                dispose();
            };

            const message = (ev: MessageEvent<any>) => {
                const data: {
                    taskId: number;
                    success: boolean;
                    err: string;
                } = JSON.parse(ev.data);

                if (taskId === data.taskId) {
                    if (data.success) resolve();
                    else reject(new Error(data.err));
                    dispose();
                }
            };

            _ws.addEventListener("message", message);
            _ws.addEventListener("close", close);

            if (_ws.readyState === _ws.CLOSED) close();

            task(taskId).then(async (resp) => {
                if (!resp.ok) throw new Error(`Task failed with status ${resp.status}: ${await resp.text()}`);
            }).catch(reject);
        });
    }

    export async function listDir(path: string, options?: { sort?: SortOptions, pagination: undefined }): Promise<VfsNode[]>
    export async function listDir(path: string, options?: { sort?: SortOptions, pagination: { page: number, limit: number } }): Promise<{ entries: VfsNode[], page: number, totalPages: number, totalEntries: number }>
    export async function listDir(path: string, options?: { sort?: SortOptions, pagination?: { page: number, limit: number } }): Promise<VfsNode[] | { entries: VfsNode[], page: number, totalPages: number, totalEntries: number }> {
        let url = `/vfs/api/listDir?path=${encodeURIComponent(path)}`;
        if (options !== undefined) {
            url += `&opt=${encodeURIComponent(encodeBase64(JSON.stringify(options)))}`;
        }
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) throw new Error(`Failed to fetch with resp '${await resp.text()}'`);
        return await resp.json();
    }

    export async function mkdir(path: string) {
        await taskConfirm((taskId) => fetch(`/vfs/api/mkdir?taskId=${taskId}&path=${encodeURIComponent(path)}`, { method: "POST" }));
    }

    export async function rm(path: string) {
        await taskConfirm((taskId) => fetch(`/vfs/api/rm?taskId=${taskId}&path=${encodeURIComponent(path)}`, { method: "POST" }));
    }

    export async function rename(srcPath: string, destPath: string) {
        await taskConfirm((taskId) => fetch(`/vfs/api/rename?taskId=${taskId}&src=${encodeURIComponent(srcPath)}&dest=${encodeURIComponent(destPath)}`, { method: "POST" }));
    }

    export async function copy(srcPath: string, destPath: string) {
        await taskConfirm((taskId) => fetch(`/vfs/api/copy?taskId=${taskId}&src=${encodeURIComponent(srcPath)}&dest=${encodeURIComponent(destPath)}`, { method: "POST" }));
    }

    export async function writeFile(path: string, data: BodyInit) {
        await taskConfirm((taskId) => fetch(`/vfs/api/writeFile?taskId=${taskId}&path=${encodeURIComponent(path)}`, { method: "POST", body: data }));
    }

    export async function remap(path: string) {
        await taskConfirm((taskId) => fetch(`/vfs/api/remap?taskId=${taskId}&path=${encodeURIComponent(path)}`, { method: "POST" }));
    }

    export async function readFile<T>(path: string, read: (resp: Response) => T | Promise<T>) {
        const resp = await fetch(`/vfs/api/readFile?path=${encodeURIComponent(path)}`, { method: "GET" });
        if (!resp.ok) throw new Error(`Failed to read file: '${await resp.text()}'`);
        return read(resp);
    }

    /**
     * 
     * @param path 
     * @param download If true, uses content disposition to force browser to download rather than view for certain file types
     */
    export async function downloadFile(path: string, download: boolean = false) {
        const value = download ? 1 : 0;
        window.open(`/vfs/api/readFile?path=${encodeURIComponent(path)}&download=${value}`, "blank");
    }
}

export default Vfs;