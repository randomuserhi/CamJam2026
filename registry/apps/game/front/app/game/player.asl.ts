import { InputState } from "./input/inputProvider.asl";
import { BoxCollider } from "./math/physics.asl";
import { Vec2 } from "./math/vector.asl";

export class Player {
    public health: number = 3;
    
    public speed = 100;

    public position: Vec2 = Vec2.zero();

    public velocity: Vec2 = Vec2.zero();
    public acceleration: Vec2 = Vec2.zero();

    public collider: BoxCollider = new BoxCollider();

    constructor() {
        Vec2.set(10, 10, this.collider.size);
    }

    public integrate(dt: number) {
        Vec2.add(this.position, Vec2.scale(this.velocity, dt, this.acceleration), this.position);
        Vec2.copy(this.position, this.collider.position);
    }
}