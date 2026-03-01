import { CSRID } from "../crsid.asl";
import { DoubleBuffer } from "../doubleBuffer.asl";
import { InputState } from "../input/inputProvider.asl";
import { Bezier } from "../math/bezier.asl";
import { BoxCollider } from "../math/physics.asl";
import { Vec2 } from "../math/vector.asl";
import { HerbalistProjectile, Projectile, WizardProjectile } from "./projectile.asl";

export const BASE_OFFSET = 13;
export const PLAYER_SCALE = 1.5;

export class Player {
    public idx: number = 0;
    public dodgeIdx: number = 0;
    public offset: number = BASE_OFFSET;

    public health: number = 3;
    public invincibleTimer: number = 0;

    private speed = 70;
    private walkSpeed = 40;

    private dodgeCooldown = 0.1;
    private dodgeDuration = 0.75;
    private facingDir: Vec2 = Vec2.right();
    private dodgeSpeed = 125;
    private dodgeCurve = Bezier(0.65, 0.1, 0.25, 1.0);
    private dodgeCooldownTimer = 0;
    private dodgeTimer = 0;

    private quackCooldown = 0.00;
    private quackCooldownTimer = 0;

    public position: Vec2 = Vec2.zero();

    private velocity: Vec2 = Vec2.zero();
    private acceleration: Vec2 = Vec2.zero();

    public collider: BoxCollider = new BoxCollider();
    public hurtbox: BoxCollider = new BoxCollider();

    private projCooldown: number = 1 / 6;
    private projTimer: number = 0;

    public reset() {
        this.health = 3;
        this.invincibleTimer = 0;

        this.idx = 0;
        this.offset = BASE_OFFSET;

        Vec2.zero(this.position);

        Vec2.zero(this.velocity);
        Vec2.zero(this.acceleration);

        this.dodgeCooldownTimer = 0;
        this.dodgeTimer = 0;

        this.isIdle = false;

        this.isFalling = false;
        this.fallingTimer = 0;

        this.quackCooldownTimer = 0;

        Vec2.set(20, 10, this.collider.size);
        this.collider.update();

        Vec2.set(10, 10, this.hurtbox.size);
        this.hurtbox.update();

        this.integrate(0);
    }

    public get isDodging() {
        return this.dodgeTimer > 0;
    }

    private facingUp = true;
    private facingRight = true;
    public isIdle = false;

    public isFalling = false;
    public fallingTimer = 0;
    public fallingDuration = 2.5;

    public tick(dt: number, input: InputState) {
        if (this.isFalling) {
            return;
        }

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        this.isIdle = input.movement.x === 0 && input.movement.y === 0;

        if (!this.isDodging) {
            this.offset = BASE_OFFSET;

            if (input.movement.x > 0) {
                this.facingRight = true;
            } else if (input.movement.x < 0) {
                this.facingRight = false;
            }

            if (input.movement.y > 0) {
                this.facingUp = true;
            } else if (input.movement.y < 0) {
                this.facingUp = false;
            }

            if (this.facingRight) {
                if (this.facingUp) {
                    this.idx = 2;
                } else {
                    this.idx = 3;
                }
            } else {
                if (this.facingUp) {
                    this.idx = 1;
                } else {
                    this.idx = 0;
                }
            }
        } else {
            const _t = this.dodgeTimer / this.dodgeDuration;
            this.idx = Math.floor(this.dodgeIdx + 4 * _t) % 4;

            if (_t < 0.5) {
                let t = _t / 0.5;
                this.offset = BASE_OFFSET + 15 * this.dodgeCurve(t);
            } else {
                let t = 1 - ((_t - 0.5) / 0.5);
                this.offset = BASE_OFFSET + 15 * this.dodgeCurve(t);
            }
        }

        this.movement(dt, input);
        this.quack(dt, input);

        // Integrate position
        this.integrate(dt);
    }

    private dodgeDir = Vec2.zero();

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
            Vec2.copy(input.movement, this.dodgeDir);
            if (Vec2.sqrdMagnitude(input.movement) != 0) {
                Vec2.copy(input.movement, this.facingDir);
            }

            // Movement
            Vec2.add(this.velocity, Vec2.scale(input.movement, input.attack ? this.walkSpeed : this.speed), this.velocity);

            if (input.dodge && this.dodgeCooldownTimer <= 0) {
                this.dodgeTimer = this.dodgeDuration;
                this.dodgeCooldownTimer = this.dodgeCooldown;
                this.dodgeIdx = this.idx;
                const audio = new Audio("/ancientgeese/assets/audio/jump.wav");
                audio.play();
            }

            if (this.dodgeCooldownTimer > 0) {
                this.dodgeCooldownTimer -= dt;
            }

            // Friction
            Vec2.scale(this.velocity, 0.7, this.velocity);
        }
    }

    public target = Vec2.zero();
    private shootDir = Vec2.zero();
    public lock = false;
    private projdir = Vec2.zero();
    public shooting(dt: number, input: InputState, crsid: CSRID, projectiles: DoubleBuffer<Projectile>, rand: () => number) {
        if (this.projTimer > 0) {
            this.projTimer -= dt;
        }

        if (this.dodgeTimer > 0) return;
        if (!input.attack) return;

        if (this.projTimer > 0) return;

        if (this.lock) {
            Vec2.normalize(Vec2.sub(this.target, this.position, this.shootDir), this.shootDir);
        } else {
            Vec2.copy(this.facingDir, this.shootDir);
        }

        switch (crsid.classname) {
            case "Herbalist": {
                Vec2.copy(this.shootDir, this.projdir);
                this.spawnProjectile(this.projdir, crsid, projectiles, rand);

                this.projTimer = this.projCooldown * 0.5;

                const audio = new Audio("/ancientgeese/assets/audio/leaf.wav");
                audio.play();
            } break;
            case "Jacket": {
                Vec2.copy(this.shootDir, this.projdir);
                const proj = this.spawnProjectile(this.projdir, crsid, projectiles, rand);
                proj.speed = 300;

                this.projTimer = this.projCooldown * 0.5;

                const audio = new Audio("/ancientgeese/assets/audio/leaf.wav");
                audio.play();
            } break;
            case "Warrior": {
                const lifetime = 0.4;

                Vec2.copy(this.shootDir, this.projdir);
                this.spawnProjectile(this.projdir, crsid, projectiles, rand, lifetime);

                Vec2.copy(this.shootDir, this.projdir);
                this.spawnProjectile(Vec2.rotate(this.projdir, Math.PI / 13, this.projdir), crsid, projectiles, rand, lifetime);

                Vec2.copy(this.shootDir, this.projdir);
                this.spawnProjectile(Vec2.rotate(this.projdir, -Math.PI / 13, this.projdir), crsid, projectiles, rand, lifetime);

                this.projTimer = this.projCooldown;

                const audio = new Audio("/ancientgeese/assets/audio/dagger.wav");
                audio.play();
            } break;
            case "Wizard": {
                Vec2.copy(this.shootDir, this.projdir);
                const p = this.spawnProjectile(this.projdir, crsid, projectiles, rand);
                Vec2.set(20, 20, p.collider.size);

                this.projTimer = this.projCooldown * 2;

                const audio = new Audio("/ancientgeese/assets/audio/fire.wav");
                audio.play();
            } break;
        }
    }

    private spawnProjectile(dir: Vec2, crsid: CSRID, projectiles: DoubleBuffer<Projectile>, rand: () => number, lifetime: number = 3) {
        let projectile: Projectile;

        switch (crsid.classname) {
            case "Herbalist": {
                const p = new HerbalistProjectile();
                p.scale = rand() * 2 - 1;
                projectile = p;
                projectile.damage = 1.5;
            } break;
            case "Warrior": {
                projectile = new Projectile();
                projectile.damage = 2;
            } break;
            case "Wizard": {
                const p = new WizardProjectile();
                p.maxSpeed = 500;
                p.rampDuration = 1;
                projectile = p;
                projectile.damage = 3
            } break;
            case "Jacket": {
                const p = new Projectile();
                projectile = p;
                projectile.damage = 2.5
            } break;
        }

        Vec2.copy(this.position, projectile.position);
        projectile.position.y += this.offset;
        Vec2.copy(dir, projectile.dir);
        projectile.speed = 500;
        projectile.timeAlive = lifetime;
        Vec2.set(5, 20, projectile.collider.size);

        projectiles.buffer.push(projectile);

        return projectile;
    }

    private quack(dt: number, input: InputState) {
        if (this.quackCooldownTimer > 0) {
            this.quackCooldownTimer -= dt;
            return;
        }

        if (!input.quack)
            return;

        this.quackCooldownTimer = this.quackCooldown;

        const audio = new Audio("/ancientgeese/assets/audio/quack.wav");
        audio.play()
    }

    private integrate(dt: number) {
        Vec2.add(this.position, Vec2.scale(this.velocity, dt, this.acceleration), this.position);
        Vec2.copy(this.position, this.collider.position);
        Vec2.copy(this.position, this.hurtbox.position);

        this.hurtbox.position.y += 15;
    }
}