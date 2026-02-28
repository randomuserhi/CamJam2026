import { GameState } from "./game.asl";
import { InputState } from "./input/inputProvider.asl";
import { Bezier } from "./math/bezier.asl";
import { BoxCollider } from "./math/physics.asl";
import { Vec2 } from "./math/vector.asl";
import { Projectile } from "./projectile.asl";
import { sprites } from "./sprite.asl";

export class Player {
    public health: number = 3;

    private speed = 70;
    private walkSpeed = 40;

    private dodgeCooldown = 0.5;
    private dodgeCooldownTimer = 0;
    private dodgeDuration = 0.45;
    private dodgeTimer = 0;
    private dodgeDir: Vec2 = Vec2.right();
    private dodgeSpeed = 150;
    private dodgeCurve = Bezier(0.65, 0.1, 0.25, 1.0);

    private quackCooldown = 0.00;
    private quackCooldownTimer = 0;

    public position: Vec2 = Vec2.zero();

    private velocity: Vec2 = Vec2.zero();
    private acceleration: Vec2 = Vec2.zero();

    public collider: BoxCollider = new BoxCollider();

    private projCooldown: number = 1 / 6;
    private projTimer: number = 0;

    private state: GameState;

    constructor(state: GameState) {
        this.state = state;
        Vec2.set(10, 10, this.collider.size);
    }

    public get isDodging() {
        return this.dodgeTimer > 0;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.scale(0.2, 0.2);
        ctx.rotate(Math.PI);
        ctx.drawImage(sprites.duck, -sprites.duck.width / 2, -sprites.duck.height / 2)
        ctx.restore();
    }

    public tick(dt: number, input: InputState) {
        this.movement(dt, input);
        this.shoot(dt, input);
        this.quack(dt, input);

        // Integrate position
        this.integrate(dt);
    }

    private movement(dt: number, input: InputState) {
        if (this.isDodging) {
            const _t = this.dodgeTimer / this.dodgeDuration;
            let speed = 1;
            const floor = 0.5;
            if (_t < 0.5) {
                let t = _t / 0.5;
                if (t < floor) t = floor;
                speed = this.dodgeSpeed * this.dodgeCurve(t);
            } else {
                let t = 1 - ((_t - 0.5) / 0.5);
                if (t < floor) t = floor;
                speed = this.dodgeSpeed * this.dodgeCurve(t);
            }
            Vec2.copy(Vec2.scale(this.dodgeDir, speed), this.velocity);
            this.dodgeTimer -= dt;
        } else {
            if (Vec2.sqrdMagnitude(input.movement) != 0) {
                Vec2.copy(input.movement, this.dodgeDir);
            }

            // Movement
            Vec2.add(this.velocity, Vec2.scale(input.movement, input.attack ? this.walkSpeed : this.speed), this.velocity);

            if (input.dodge && this.dodgeCooldownTimer <= 0) {
                this.dodgeTimer = this.dodgeDuration;
                this.dodgeCooldownTimer = this.dodgeCooldown;
            }

            if (this.dodgeCooldownTimer > 0) {
                this.dodgeCooldownTimer -= dt;
            }

            // Friction
            Vec2.scale(this.velocity, 0.7, this.velocity);
        }
    }

    private shoot(dt: number, input: InputState) {
        if (this.projTimer > 0) {
            this.projTimer -= dt;
        }

        if (this.dodgeTimer > 0) return;
        if (!input.attack) return;

        if (this.projTimer > 0) return;
        this.projTimer = this.projCooldown;

        const projectile = new Projectile();
        Vec2.copy(this.position, projectile.position);
        /*if (this.state.enemy) {
            Vec2.normalize(Vec2.sub(this.enemy.position, player.position, projectile.dir), projectile.dir);
        } else {
            Vec2.copy(this.dodgeDir, projectile.dir);
        }*/
        Vec2.copy(this.dodgeDir, projectile.dir);
        projectile.speed = 500;
        projectile.timeAlive = 5;
        Vec2.set(5, 20, projectile.collider.size);

        this.state.playerProjectiles.buffer.push(projectile);
        const audio = new Audio("/game/assets/audio/shoot.wav");
        audio.play()
    }

    private quack(dt: number, input: InputState){
        if (this.quackCooldownTimer > 0){
            this.quackCooldownTimer -= dt;
            return;
        }

        if (!input.quack)
            return;

        this.quackCooldownTimer = this.quackCooldown;

        const audio = new Audio("/game/assets/audio/quack.wav");
        audio.play()
    }

    private integrate(dt: number) {
        Vec2.add(this.position, Vec2.scale(this.velocity, dt, this.acceleration), this.position);
        Vec2.copy(this.position, this.collider.position);
    }
}