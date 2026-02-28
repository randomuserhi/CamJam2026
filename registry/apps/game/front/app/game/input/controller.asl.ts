import { Vec2 } from "../math/vector.asl";
import { InputProvider, InputState } from "./inputProvider.asl";

export class ControllerInput extends InputProvider {
    override getInput(tickIdx: number): InputState {
        const gamepads = navigator.getGamepads(); // returns an array of connected gamepads
        
        const state: InputState = {
            movement: Vec2.zero(),
            attack: false,
            dodge: false
        };

        const gp = gamepads[1];
        if (gp === null) return state;

        state.movement.x = gp.axes[0];
        state.movement.y = -gp.axes[1];

        if (Math.abs(state.movement.x) < 0.01) state.movement.x = 0;
        if (Math.abs(state.movement.y) < 0.01) state.movement.y = 0;

        state.attack = gp.buttons[3].pressed;
        state.dodge = gp.buttons[2].pressed;

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