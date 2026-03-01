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
        break;
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
    classname: "Herbalist" | "Warrior" | "Wizard" | "Jacket";
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
    bossHealth: 5000,
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

    if (replay.crsid.id === "ceht2") {
        res.statusCode = 500;
        res.end("Master card");
        inGame = false;
        return;
    }

    crsidMap[replay.crsid.id] = name;
    await fs.writeFile(path.join(PATH, "replays", name), finishedRun.replay);

    nextState = JSON.parse(finishedRun.nextState);
    ++nextState.runId;
    await fs.writeFile(NEXT_STATE_PATH, JSON.stringify(nextState));
    await fs.writeFile(CRSID_MAP_PATH, JSON.stringify(crsidMap));

    inGame = false;

    res.statusCode = 200;
    res.end("Done!");
});

import { Client } from "ldapts";

export const DuckBody: DuckBody[] = [
    "herbalist",
    "warrior",
    "mage",
    "jacket",
    "none"
];

export const DuckHat: DuckHat[] = [
    "bandana",
    "flower",
    "hunter",
    "leather",
    "spartan",
    "wizard",
    "none"
];

export const DuckClasses = [
    "Herbalist", "Warrior", "Wizard", "Jacket"
] as const;

const hatTerms = [
    [
        "Christ",
        "Churchill",
        "Clare College",
        "Clare Hall",
        "Corpus",
        "Darwin"
    ],
    [
        "Downing",
        "Emmanuel",
        "Fitzwilliam",
        "Girton",
        "Gonville",
    ],
    [
        "Homerton",
        "Hughes",
        "Jesus",
        "King",
        "Lucy",
    ],
    [
        "Magdalene",
        "Murray",
        "Newnham",
        "Pembroke",
        "Peterhouse",
    ],
    [
        "Queen",
        "Robinson",
        "Selwyn",
        "Sidney",
        "Catherine"
    ],
    [
        "Edmund",
        "John",
        "Trinity College",
        "Trinity Hall",
        "Wolfson"
    ]
];

app.route("GET", "/api/start", async (match, req, res, url) => {
    if (inGame || !url.searchParams.has("id")) {
        res.statusCode = 500;
        res.end("Already in game.");
        return;
    }

    inGame = true;

    const id = url.searchParams.get("id")!.toLowerCase();

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

        let hat: DuckHat = "none";
        let college: string = "UNKNOWN";
        for (let i = 0; i < hatTerms.length; ++i) {
            const includes = hatTerms[i];
            for (const term of result.ou) {
                const str = `${term}`.toLowerCase();
                for (const inc of includes) {
                    if (str.includes(inc.toLowerCase())) {
                        hat = DuckHat[i];
                        college = inc;
                        break;
                    }
                }
            }
        }

        let classname = DuckClasses[((result as any).studentNumber ?? 0) % 3];
        if (id === "jl2395") classname = "Jacket";

        if (id === "ceht2") classname = "Warrior";

        let body: DuckBody = "mage";
        switch (classname) {
            case "Herbalist": body = "herbalist"; break;
            case "Warrior": body = "warrior"; break;
            case "Wizard": body = "mage"; break;
            case "Jacket": body = "jacket"; break;
        }

        const crsid: CRSID = {
            name: `${result.givenName} ${result.sn}`,
            college: `${college}`,
            body,
            classname,
            hat,
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

app.route("POST", "api/saveSoul", async (match, req, res, url) => {
    if (!inGame || !url.searchParams.has("player") || !url.searchParams.has("soul")) {
        res.statusCode = 500;
        res.end("Not in game.");
        return;
    }

    const player = url.searchParams.get("player")!;
    const soul = url.searchParams.get("soul")!;

    console.log(`${player} saved the soul of ${soul}`);

    res.statusCode = 200;
    res.end("")
})
