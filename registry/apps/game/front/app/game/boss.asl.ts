import { BoxCollider } from "./math/physics.asl";
import { Vec2 } from "./math/vector.asl";

export class Boss {
    public position: Vec2 = Vec2.zero();

    public velocity: Vec2 = Vec2.zero();
    public acceleration: Vec2 = Vec2.zero();

    public collider: BoxCollider = new BoxCollider();

    public projCooldown: number = 1 / 5; //1 / 20;
    public projTimer: number = 0;

    constructor() {
        Vec2.set(100, 100, this.collider.size);
    }

    public integrate(dt: number) {
        Vec2.add(this.position, Vec2.scale(this.velocity, dt, this.acceleration), this.position);
        Vec2.copy(this.position, this.collider.position);
    }
}