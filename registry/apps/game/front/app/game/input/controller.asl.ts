import { Vec2 } from "../math/vector.asl";
import { InputProvider, InputState } from "./inputProvider.asl";

// TODO(randomuserhi):
export class ControllerInput extends InputProvider {
    public getInput(tickIdx: number): InputState {
        const gamepads = navigator.getGamepads(); // returns an array of connected gamepads
        for (const gp of gamepads) {
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
        }

        return {
            movement: Vec2.zero(),
            attack: false,
            dodge: false
        };
    }
}