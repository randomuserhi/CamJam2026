import FileSync from "fs";
import { app } from "rapid";
import { front } from "rapid/async-path";
import { pipeline } from "stream/promises";
import Vfs from "vfs/lib/index.asl";
import { WebSocketServer } from "ws";
import { drives } from "./state.asl";
import { decodeBase64 } from "common/lib/bit.asl";

// --------- App Debug Interface ---------

app.route("GET", "/", async (match, req, res) => {
    await app.serve(await front("app", "index.html"), res);
});

// --------- API ----------

/**
 * Manages read/write tasks triggered from front end so that they can respond on completion via websocket
 * This allows the front end to track when opertions finish.
 */
class TaskManager {
    private id = 0;
    private readonly tasks = new Map<number, Promise<unknown>>();
    
    public readonly webSocketServer: WebSocketServer = new WebSocketServer({ noServer: true });

    constructor() {
        __ASL.onAbort(() => {
            for (const client of this.webSocketServer.clients) {
                client.close();
            }
            this.webSocketServer.close();
        });
    }

    private broadcast(obj: any) {
        for (const client of this.webSocketServer.clients) {
            if (client.readyState !== client.OPEN) continue;
            client.send(JSON.stringify(obj));
        }
    }

    public getId() {
        let id: number;
        do {
            id = (++this.id) >>> 0;
        } while (this.tasks.has(id));
        return id;
    }

    public register(id: number, task: Promise<unknown>) {
        this.tasks.set(id, task);
        task.then(() => {
            this.broadcast({
                taskId: id,
                success: true
            });
        }).catch((err) => {
            console.error(err);
            this.broadcast({
                taskId: id,
                success: false,
                err: (err instanceof Error) ? err.message.toString() : String(err)
            });
        }).finally(() => {
            this.tasks.delete(id);
        });
        return id;
    }

    public get(id: number) {
        return this.tasks.get(id);
    }
}

const taskManager = new TaskManager();

app.route("GET", "/api/taskId", async (match, req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    res.end(JSON.stringify({ taskId: taskManager.getId() }));
});

app.route("GET", "/api/listDir", async (match, req, res, url) => {
    const path = url.searchParams.get("path");
    let options: { sort?: Vfs.SortOptions, region?: { count: number, offset: number } } | undefined = undefined;
    if (url.searchParams.has("opt")) {
        options = JSON.parse(decodeBase64(decodeURIComponent(url.searchParams.get("opt")!)));
    }
    if (!path || path.length === 0 || path === "/" || path === ".") {
        // TODO(randomuserhi): Apply options (sort and limit)

        const entries: Vfs.VfsNode[] = [];

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

        res.setHeader("Content-Type", "application/json" );
        res.statusCode = 200;
        res.end(JSON.stringify(entries));
        return;
    }

    if (!Vfs.checkDrivePermissions(path, "Read")) {
        res.statusCode = 500;
        res.end("Permission Denied");
        return;
    }
    
    try {
        res.setHeader("Content-Type", "application/json" );
        res.statusCode = 200;
        res.end(JSON.stringify(await Vfs.listDir(path, options)));
    } catch (err) {
        res.statusCode = 500;
        res.end(`${err}`);
    }
});

app.route("GET", "/api/readFile", async (match, req, res, url) => {
    const path = url.searchParams.get("path");
    if (!path) {
        res.statusCode = 500;
        res.end("Incorrect parameters");
        return;
    }

    const download = (parseInt(url.searchParams.get("download") ?? "0")) != 0; 

    if (!Vfs.checkDrivePermissions(path, "Read")) {
        res.statusCode = 500;
        res.end("Permission Denied");
        return;
    }
    
    try {
        await Vfs.readFile(path, async (path, node) => {
            res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${node.name}"`);
            await app.serve(path, res);
        });
    } catch (err) {
        res.statusCode = 500;
        res.end(`${err}`);
    }
});

app.route("POST", "/api/writeFile", (match, req, res, url) => {
    const path = url.searchParams.get("path");
    if (!url.searchParams.has("taskId") || !path) {
        res.statusCode = 500;
        res.end("Incorrect parameters");
        return;
    }

    if (!Vfs.checkDrivePermissions(path, "Write")) {
        res.statusCode = 500;
        res.end("Permission Denied");
        return;
    }
    
    try {
        const taskId = parseInt(url.searchParams.get("taskId")!);
        taskManager.register(taskId, Vfs.writeFile(path, async (p) => {
            const stream = FileSync.createWriteStream(p);
            await pipeline(req, stream);
        }));

        res.setHeader("Content-Length", "0" );
        res.statusCode = 200;
        res.end();
    } catch (err) {
        console.log(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
});

app.route("POST", "/api/mkdir", (match, req, res, url) => {
    const path = url.searchParams.get("path");
    if (!url.searchParams.has("taskId") || !path) {
        res.statusCode = 500;
        res.end("Incorrect parameters");
        return;
    }

    if (!Vfs.checkDrivePermissions(path, "Write")) {
        res.statusCode = 500;
        res.end("Permission Denied");
        return;
    }
    
    try {
        const taskId = parseInt(url.searchParams.get("taskId")!);
        taskManager.register(taskId, Vfs.mkdir(path));

        res.setHeader("Content-Length", "0");
        res.statusCode = 200;
        res.end();
    } catch (err) {
        console.log(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
});

app.route("POST", "/api/rm", (match, req, res, url) => {
    const path = url.searchParams.get("path");
    if (!url.searchParams.has("taskId") || !path) {
        res.statusCode = 500;
        res.end("Incorrect parameters");
        return;
    }

    if (!Vfs.checkDrivePermissions(path, "Write")) {
        res.statusCode = 500;
        res.end("Permission Denied");
        return;
    }
    
    try {
        const taskId = parseInt(url.searchParams.get("taskId")!);
        taskManager.register(taskId, Vfs.rm(path));

        res.setHeader("Content-Length", "0");
        res.statusCode = 200;
        res.end();
    } catch (err) {
        console.log(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
});

app.route("POST", "/api/rename", (match, req, res, url) => {
    const src = url.searchParams.get("src");
    const dest = url.searchParams.get("dest");
    if (!url.searchParams.has("taskId") || !src || !dest) {
        res.statusCode = 500;
        res.end("Incorrect parameters");
        return;
    }

    if (!Vfs.checkDrivePermissions(src, "Write") || !Vfs.checkDrivePermissions(dest, "Write")) {
        res.statusCode = 500;
        res.end("Permission Denied");
        return;
    }
    
    try {
        const taskId = parseInt(url.searchParams.get("taskId")!);
        taskManager.register(taskId, Vfs.rename(src, dest));

        res.setHeader("Content-Length", "0");
        res.statusCode = 200;
        res.end();
    } catch (err) {
        console.log(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
});

app.route("POST", "/api/copy", (match, req, res, url) => {
    const src = url.searchParams.get("src");
    const dest = url.searchParams.get("dest");
    if (!url.searchParams.has("taskId") || !src || !dest) {
        res.statusCode = 500;
        res.end("Incorrect parameters");
        return;
    }

    if (!Vfs.checkDrivePermissions(src, "Write") || !Vfs.checkDrivePermissions(dest, "Write")) {
        res.statusCode = 500;
        res.end("Permission Denied");
        return;
    }

    try {
        const taskId = parseInt(url.searchParams.get("taskId")!);
        taskManager.register(taskId, Vfs.copy(src, dest));

        res.setHeader("Content-Length", "0");
        res.statusCode = 200;
        res.end();
    } catch (err) {
        console.log(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
});

app.route("POST", "/api/remap", async (match, req, res, url) => {
    const path = url.searchParams.get("path");
    if (!url.searchParams.has("taskId") || !path) {
        res.statusCode = 500;
        res.end("Incorrect parameters");
        return;
    }

    if (!Vfs.checkDrivePermissions(path, "Write")) {
        res.statusCode = 500;
        res.end("Permission Denied");
        return;
    }

    try {
        const taskId = parseInt(url.searchParams.get("taskId")!);
        taskManager.register(taskId, Vfs.remap(path));

        res.setHeader("Content-Length", "0");
        res.statusCode = 200;
        res.end();
    } catch (err) {
        console.log(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
});

app.upgrade("/", (match, req, socket, head) => {
    taskManager.webSocketServer.handleUpgrade(req, socket, head, (ws) => {
        taskManager.webSocketServer.emit("connection", ws, req);
    });
});