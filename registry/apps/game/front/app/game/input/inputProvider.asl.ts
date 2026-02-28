import { Vec2 } from "../math/vector.asl";

export interface InputState {
    movement: Vec2;
    attack: boolean;
    dodge: boolean;
    quack: boolean;
}

export class InputProvider {
    public getInput(tickIdx: number): InputState {
        throw new Error("Not Implemented!");
    }
}