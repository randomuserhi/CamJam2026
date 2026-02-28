import { Vec2 } from "../math/vector.asl";
import { InputProvider, InputState } from "./inputProvider.asl";

export interface InputFrame {
    state: InputState;
    idx: number;
}

export class InputRecorder {
    frames: InputFrame[];

    constructor() {
        this.frames = [];
    }

    public push(idx: number, state: InputState) {
        if (this.frames.length === 0) {
            this.frames.push({ state: structuredClone(state), idx });
            return;
        }
        const last = this.frames[this.frames.length - 1].state;
        let dirty = last.attack != state.attack || last.dodge != state.dodge || !Vec2.equals(last.movement, state.movement);
        if (dirty) {
            this.frames.push({ state: structuredClone(state), idx })
        }
    }
}

export class ReplayController extends InputProvider {
    frames: InputFrame[];

    constructor(frames: InputFrame[]) {
        super();
        this.frames = frames;
    }

    override getInput(tickIdx: number): InputState {
        // TODO(randomuserhi): Make into binary search for performance
        let state: InputState = undefined!;
        for (let i = 0; i < this.frames.length; ++i) {
            if (this.frames[i].idx > tickIdx) break;
            state = this.frames[i].state;
        }
        return state;
    }
}