import { app } from "rapid";
import { front } from "rapid/async-path";
import { WebSocketServer } from "ws";
import path from "path";
import fs from "fs/promises";
import { fileStat } from "common/lib/file.asl";

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
    inGame = false;
    await app.serve(await front("app", "index.html"), res);
});

app.upgrade("/", (match, req, socket, head) => {
    webSocketServer.handleUpgrade(req, socket, head, (ws) => {
        webSocketServer.emit("connection", ws, req);
    });
});

export type DuckHat = "bandana" | "flower" | "hunter" | "leather" | "spartan" | "wizard" | "none";
export type DuckBody = "none" | "herbalist" | "jacket" | "mage" | "warrior";

export interface CRSID {
    id: string;
    hat: DuckHat;
    body: DuckBody;
    name: string;
    college: string;
    classname: "Herbalist" | "Warrior" | "Wizard";
}

export interface Vec2 {
    x: number;
    y: number;
}

export interface InputState {
    movement: Vec2;
    attack: boolean;
    dodge: boolean;
    quack: boolean;
}

export interface InputFrame {
    state: InputState;
    idx: number;
}

export interface GameState {
    runId: number;
    rngSeed: number;
    crsid: CRSID;
    bossHealth: number;
    deadBodies: {
        health: number;
        crsid: CRSID;
        position: Vec2;
        isBroken: boolean;
        idx: number;
    }[];
    frames?: InputFrame[];
}

const PATH = "../data/";
const NEXT_STATE_PATH = path.join(PATH, "nextState.json");
const CRSID_MAP_PATH = path.join(PATH, "map.json");
await fs.mkdir(PATH, { recursive: true });
await fs.mkdir(path.join(PATH, "replays"), { recursive: true });

let nextState: GameState = {
    runId: 0,
    crsid: undefined!,
    rngSeed: 10,
    bossHealth: Infinity,
    deadBodies: []
};
if (await fileStat(NEXT_STATE_PATH)) {
    nextState = JSON.parse(await fs.readFile(NEXT_STATE_PATH, { encoding: "utf-8" }))
}

let crsidMap: { [k: string]: string } = {};
if (await fileStat(CRSID_MAP_PATH)) {
    crsidMap = JSON.parse(await fs.readFile(CRSID_MAP_PATH, { encoding: "utf-8" }))
}

let inGame = false;

app.route("POST", "/api/finish", async (match, req, res, url) => {
    if (!inGame) {
        console.log("Not in game!");
        res.statusCode = 500;
        res.end("Not in game.");
        return;
    }

    let body: string = "";
    for await (const chunk of req) {
        body += chunk.toString(); // convert Buffer to string
    }

    const finishedRun: {
        replay: string;
        nextState: string;
    } = JSON.parse(body);

    const replay = JSON.parse(finishedRun.replay);
    const name = `${replay.runId.toString().padStart(4, '0')}.json`;
    crsidMap[replay.crsid.id] = name;
    await fs.writeFile(path.join(PATH, "replays", name), finishedRun.replay);

    nextState = JSON.parse(finishedRun.nextState);
    ++nextState.runId;
    await fs.writeFile(NEXT_STATE_PATH, JSON.stringify(nextState));
    await fs.writeFile(CRSID_MAP_PATH, JSON.stringify(crsidMap));

    inGame = false;
});

import { Client } from "ldapts";

app.route("GET", "/api/start", async (match, req, res, url) => {
    if (inGame || !url.searchParams.has("id")) {
        res.statusCode = 500;
        res.end("Already in game.");
        return;
    }

    inGame = true;

    const id = url.searchParams.get("id")!;

    if (id in crsidMap) {
        broadcast(JSON.parse(await fs.readFile(path.join(PATH, "replays", crsidMap[id]), { encoding: "utf-8" })));
        res.statusCode = 200;
        res.end("Done!");
        return;
    }

    const bindDN = `ou=people,o=University of Cambridge,dc=cam,dc=ac,dc=uk`;
    const searchDN = 'ou=people,o=University of Cambridge,dc=cam,dc=ac,dc=uk';

    const client = new Client({
        url: `ldaps://ldap.lookup.cam.ac.uk`
    });

    try {
        await client.bind(bindDN);

        const { searchEntries } = await client.search(searchDN, {
            scope: 'sub',
            filter: `(uid=${id})`,
        });

        const result = searchEntries[0];
        if (!result) throw new Error(`No person with the given ID: ${id}!`);

        // TODO
        const crsid: CRSID = {
            name: `${result.givenName} ${result.sn}`,
            college: `${result.ou[0]}`,
            body: "jacket",
            classname: "Warrior",
            hat: "bandana",
            id
        }

        nextState.crsid = crsid;
        broadcast(nextState);

        res.statusCode = 200;
        res.end("Done!");
    } catch (ex) {
        res.statusCode = 500;
        res.end(`Something went wrong!`);
        console.error(ex);
    } finally {
        await client.unbind();
    }
});