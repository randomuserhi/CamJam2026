import { CSRID as CRSID } from "../crsid.asl";
import { InputFrame } from "../input/replayController.asl";
import { Vec2 } from "../math/vector.asl";

export interface GameState {
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