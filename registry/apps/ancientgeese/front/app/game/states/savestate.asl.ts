import { CSRID as CRSID } from "../crsid.asl";
import { InputFrame } from "../input/replayController.asl";
import { Vec2 } from "../math/vector.asl";

export interface SaveStateData {
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

export class SaveState {
    data: SaveStateData;

    constructor(rngSeed: number, crsid: CRSID, frames?: InputFrame[]) {
        this.data = {
            crsid,
            rngSeed,
            bossHealth: Infinity,
            deadBodies: [{
                crsid: { body: "jacket", classname: "Warrior", college: "", hat: "bandana", name: "asd" },
                health: 5,
                idx: 1,
                isBroken: false,
                position: Vec2.set(70, 700)
            }],
            frames
        };
    }
}

(window as any).SaveState = SaveState;