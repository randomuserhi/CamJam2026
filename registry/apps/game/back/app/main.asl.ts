import { app } from "rapid";
import { front } from "rapid/async-path";
import { WebSocketServer } from "ws";

const webSocketServer: WebSocketServer = new WebSocketServer({ noServer: true });
__ASL.onAbort(() => {
    for (const client of webSocketServer.clients) {
        client.close();
    }
    webSocketServer.close();
});
function broadcast(obj: any) {
    for (const client of webSocketServer.clients) {
        if (client.readyState !== client.OPEN) continue;
        client.send(JSON.stringify(obj));
    }
}

app.route("GET", "/", async (match, req, res) => {
    await app.serve(await front("app", "index.html"), res);
});

app.upgrade("/", (match, req, socket, head) => {
    webSocketServer.handleUpgrade(req, socket, head, (ws) => {
        webSocketServer.emit("connection", ws, req);
    });
});

app.route("POST", "/start", async (match, req, res, url) => {
    if (!url.searchParams.has("id")) {
        res.statusCode = 500;
        res.end("no user id provided");
        return;
    }
    console.log(`user registered ${url.searchParams.get("id")}`);
    res.statusCode = 200;
    res.end("registered");
});
