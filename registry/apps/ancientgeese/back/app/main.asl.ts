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

app.route("POST", "/api/", (match, req, socket, head) => {
});

import { Client } from "ldapts";
(async () => {
    const COLLECTED_ID = 'ceht2'

    const url = 'ldaps://ldap.lookup.cam.ac.uk';
    const bindDN = `ou=people,o=University of Cambridge,dc=cam,dc=ac,dc=uk`;
    const searchDN = 'ou=people,o=University of Cambridge,dc=cam,dc=ac,dc=uk';

    const client = new Client({
        url
    });

    try {
        await client.bind(bindDN);

        const { searchEntries, searchReferences } = await client.search(searchDN, {
            scope: 'sub',
            filter: `(uid=${COLLECTED_ID})`,
        });

        console.log(searchEntries, searchReferences);
    } catch (ex) {
        throw ex;
    } finally {
        await client.unbind();
    }
})()