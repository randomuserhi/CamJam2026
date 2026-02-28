import { BoxCollider } from "./math/physics.asl";
import { Vec2 } from "./math/vector.asl";

const up = Vec2.up();

export class Projectile {
    position: Vec2 = Vec2.zero();
    dir: Vec2 = Vec2.zero();
    speed: number = 0;

    timeAlive = 0;

    collider: BoxCollider = new BoxCollider();

    private velocity: Vec2 = Vec2.zero();

    public tick(dt: number) {
        this.integrate(dt);
    }

    public integrate(dt: number) {
        Vec2.add(this.position, Vec2.scale(this.dir, this.speed * dt, this.velocity), this.position);
        Vec2.copy(this.position, this.collider.position);
        this.collider.rotation = Vec2.angle(up, this.dir);
    }
}