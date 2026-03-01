import { CSRID } from "../crsid.asl";
import { drawImage } from "../drawing.asl";
import { Bezier } from "../math/bezier.asl";
import { BoxCollider } from "../math/physics.asl";
import { Vec2 } from "../math/vector.asl";
import { sprites } from "../sprites.asl";

const up = Vec2.up();

export class Projectile {
    position: Vec2 = Vec2.zero();
    dir: Vec2 = Vec2.zero();
    speed: number = 0;
    damage: number = 0;
    timeAlive = 0;

    collider: BoxCollider = new BoxCollider();

    private velocity: Vec2 = Vec2.zero();

    public tick(dt: number) {
        if (this.timeAlive <= 0) return;
        this.timeAlive -= dt;
        this.integrate(dt);
    }

    public draw(ctx: CanvasRenderingContext2D, time: number, dt: number, crsid: CSRID) {
        const angle = Vec2.angle(this.dir, up);
        switch (crsid.classname) {
            case "Herbalist": {
                const scale = 1;
                drawImage(ctx, sprites.projectiles.leaf, this.position.x, this.position.y, scale, scale, angle);
            } break;
            case "Warrior": {
                const scale = 1;
                drawImage(ctx, sprites.projectiles.dagger, this.position.x, this.position.y, scale, scale, angle);
            } break;
            case "Wizard": {
                const scale = 1.5;
                drawImage(ctx, sprites.projectiles.fireball, this.position.x, this.position.y, scale, scale, angle);
            } break;
        }
    }

    public integrate(dt: number) {
        Vec2.add(this.position, Vec2.scale(this.dir, this.speed * dt, this.velocity), this.position);
        Vec2.copy(this.position, this.collider.position);
        this.collider.rotation = Vec2.angle(up, this.dir);
    }
}

export class EnemyProjectile extends Projectile {
    public draw(ctx: CanvasRenderingContext2D, time: number, dt: number, crsid: CSRID) {
        const angle = Vec2.angle(this.dir, up);
        const scale = 1 * (this.collider.size.x + this.collider.size.y) / 2 / 8;
        drawImage(ctx, sprites.boss.projectiles.orb, this.position.x, this.position.y, scale, scale, angle);
    }
}

export class HerbalistProjectile extends Projectile {
    perp: Vec2 = Vec2.zero();

    scale: number = 1;

    public integrate(dt: number) {
        super.integrate(dt);
        let offset = this.scale * Math.sin(this.timeAlive * 20) * 2.5;
        Vec2.add(this.position, Vec2.scale(Vec2.perp(this.dir, this.perp), offset, this.perp), this.position);
    }
}

const wizardCurve = Bezier(.54, .08, 0, 1.04);
export class WizardProjectile extends Projectile {
    perp: Vec2 = Vec2.zero();

    maxSpeed: number = 0;
    rampDuration: number = 0;
    private timer: number = 0;

    public integrate(dt: number) {
        this.timer += dt;
        const t = Math.clamp01(this.timer / this.rampDuration);
        this.speed = wizardCurve(t) * this.maxSpeed + 100;
        super.integrate(dt);
    }
}