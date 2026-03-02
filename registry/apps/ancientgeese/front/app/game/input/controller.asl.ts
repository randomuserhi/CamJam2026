import { Vec2 } from "../math/vector.asl";
import { InputProvider, InputState } from "./inputProvider.asl";

const keyboard = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    l: false,
    space: false
};

window.addEventListener("keydown", (e) => {
    switch (e.keyCode) {
    case 87:
        keyboard.w = true;
        break;  
    case 65:
        keyboard.a = true;
        break;  
    case 83:
        keyboard.s = true;
        break;  
    case 68:
        keyboard.d = true;
        break;  
    case 32:
        keyboard.shift = true;
        break;  
    case 76:
        keyboard.l = true;
        break;  
    case 16:
        keyboard.space = true;
        break;  
    }
}, { signal: __ASL.signal });

window.addEventListener("keyup", (e) => {
    switch (e.keyCode) {
    case 87:
        keyboard.w = false;
        break;  
    case 65:
        keyboard.a = false;
        break;  
    case 83:
        keyboard.s = false;
        break;  
    case 68:
        keyboard.d = false;
        break;  
    case 32:
        keyboard.shift = false;
        break;  
    case 76:
        keyboard.l = false;
        break;  
    case 16:
        keyboard.space = false;
        break;  
    }
}, { signal: __ASL.signal });

export class ControllerInput extends InputProvider {
    private lastQuackInput = false;

    override getInput(tickIdx: number): InputState {
        const gamepads = navigator.getGamepads(); // returns an array of connected gamepads

        const state: InputState = {
            movement: Vec2.zero(),
            attack: false,
            dodge: false,
            quack: false
        };

        let gp = undefined;
        for (const _gp of gamepads) {
            if (!_gp) continue;
            gp = _gp;
            break;
        }
        if (!gp) {

            if (keyboard.a)
                state.movement.x -= 1; 

            if (keyboard.d)
                state.movement.x += 1; 

            if (keyboard.w)
                state.movement.y += 1; 

            if (keyboard.s)
                state.movement.y -= 1; 

            state.dodge = keyboard.shift;

            state.attack = keyboard.l;

            state.quack = keyboard.space;

            return state;
        }

        state.movement.x = gp.axes[0];
        state.movement.y = -gp.axes[1];

        if (Math.abs(state.movement.x) < 0.01) state.movement.x = 0;
        if (Math.abs(state.movement.y) < 0.01) state.movement.y = 0;

        Vec2.normalize(state.movement, state.movement);

        state.attack = gp.buttons[3].pressed;
        state.dodge = gp.buttons[2].pressed;
        if (!this.lastQuackInput && gp.buttons[0].pressed)
            state.quack = true;
        this.lastQuackInput = gp.buttons[0].pressed;

        /*for (const gp of gamepads) {
            if (!gp) continue;

            // Buttons
            gp.buttons.forEach((button, index) => {
                if (button.pressed) {
                    console.log(`Button ${index} is pressed`);
                }
            });

            // Axes (analog sticks)
            gp.axes.forEach((axis, index) => {
                if (Math.abs(axis) > 0.1) { // deadzone threshold
                    console.log(`Axis ${index} value: ${axis.toFixed(2)}`);
                }
            });
        }*/

        return state;
    }
}