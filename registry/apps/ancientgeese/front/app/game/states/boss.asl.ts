import { DoubleBuffer } from "../doubleBuffer.asl";
import { drawImage } from "../drawing.asl";
import { BoxCollider } from "../math/physics.asl";
import { Vec2 } from "../math/vector.asl";
import { Camera } from "../renderer.asl";
import { sprites } from "../sprites.asl";
import { EnemyProjectile, Projectile } from "./projectile.asl";

export class Boss {
    position: Vec2 = Vec2.zero();
    velocity: Vec2 = Vec2.zero();
    acceleration: Vec2 = Vec2.zero();

    speed = 100;
    health: number = 0;

    collider: BoxCollider = new BoxCollider();
    hurtbox: BoxCollider = new BoxCollider();
    damagebox: BoxCollider = new BoxCollider();

    upperBoundY: number = 0;
    upperBoundX: number = 0;
    lowerBoundY: number = 0;
    lowerBoundX: number = 0;

    flipped: boolean = false;

    projectiles: DoubleBuffer<EnemyProjectile> = undefined!;

    public reset(camera: Camera, projectiles: DoubleBuffer<EnemyProjectile>) {
        this.projectiles = projectiles;
        this.upperBoundY = camera.size.y * 2 + camera.size.y / 2 - 150;
        this.lowerBoundY = camera.size.y * 2 - camera.size.y / 2 + 50;

        this.upperBoundX = camera.size.x / 2 - 50;
        this.lowerBoundX = -camera.size.x / 2 + 50;

        Vec2.set(0, camera.size.y * 2, this.position);
        this.state = "Scream";
        this.projTimer = 0

        Vec2.zero(this.velocity);

        Vec2.set(40, 20, this.collider.size);
        Vec2.set(30, 80, this.hurtbox.size);
        Vec2.set(50, 60, this.damagebox.size);

        this.projInterval = 0.5;

        Vec2.up(this.spiralDir);
        this.waveTimer = 0;
        this.projTimer = 0;
        this.spiralTimer = 0;

        this.integrate(0);

        this.firstScream = true;
        this.doSpiralShoot = false;
    }

    state: "Scream" | "Dash" | "Walk" = "Scream";

    projTimer = 0;
    projInterval = 0.5;
    private generalShoot(dt: number, rand: () => number) {
        if (this.projTimer > 0) {
            this.projTimer -= dt;
        }
        if (this.projTimer > 0) return;
        if (this.isCharging) return;
        if (this.state === "Scream") return;
        for (let i = 0; i < 10; ++i) {
            const p = this.spawnProjectile(this.dirToTarget);
            Vec2.rotate(p.dir, (rand() * 2 - 1) * Math.PI, p.dir);
            Vec2.normalize(p.dir, p.dir);
            p.speed = 200;
            Vec2.set(12, 12, p.collider.size);
            p.timeAlive = 5;
        }
        this.projTimer = this.projInterval;
    }

    waveTimer = 0;
    waveInterval = 1.5;
    private waveShoot(dt: number) {
        if (this.waveTimer > 0) {
            this.waveTimer -= dt;
        }
        if (this.waveTimer > 0) return;
        if (this.isCharging) return;
        const count = 60;
        for (let i = 0; i < count; ++i) {
            const p = this.spawnProjectile(this.dirToTarget);
            Vec2.rotate(p.dir, i * Math.PI * 2 / count, p.dir);
            Vec2.normalize(p.dir, p.dir);
            p.speed = i % 3 === 0 ? 200 : 150;
            Vec2.set(17, 17, p.collider.size);
            p.timeAlive = 5;
        }
        this.waveTimer = this.waveInterval;
    }

    spiralDir = Vec2.up();
    spiralTimer = 0;
    spiralInterval = 0.05;
    doSpiralShoot = false;
    private spiralShoot(dt: number) {
        Vec2.rotate(this.spiralDir, Math.deg2rad * 170 * dt, this.spiralDir);
        if (this.spiralTimer > 0) {
            this.spiralTimer -= dt;
        }
        if (this.spiralTimer > 0) return;

        const p = this.spawnProjectile(this.spiralDir);
        Vec2.normalize(p.dir, p.dir);
        p.speed = 200;
        Vec2.set(12, 12, p.collider.size);
        p.timeAlive = 5;

        this.spiralTimer = this.spiralInterval;
    }

    public tick(dt: number, rand: () => number) {
        this.integrate(dt);
        Vec2.sub(this.target, this.position, this.dirToTarget);
        Vec2.normalize(this.dirToTarget, this.dirToTarget);

        this.generalShoot(dt, rand);

        if (this.state === "Scream") {
            if (!this.firstScream) {
                if (this.doSpiralShoot) {
                    this.spiralShoot(dt);
                } else {
                    this.waveShoot(dt);
                }
            }

            if (this.screamTime > this.screamDuration) {
                this.firstScream = false;
                this.screamDuration = sprites.boss.scream.duration;
                if (rand() > 0.5)
                    this.enterWalk(rand); // enterDash
                else
                    this.enterDash();
            }
        } else if (this.state === "Walk") {
            Vec2.sub(this.destination, this.position, this.velocity);
            const dist = Vec2.sqrdMagnitude(this.velocity);
            Vec2.normalize(this.velocity, this.velocity);
            Vec2.scale(this.velocity, this.speed, this.velocity);

            if (dist < 100) {
                if (rand() > 0.5)
                    this.enterDash(); // enterDash
                else
                    this.enterScream(rand);
            }
        } else if (this.state === "Dash") {
            if (this.chargeWindUpTime > this.chargeWindUpDuration) {
                if (!this.charged) {
                    Vec2.scale(this.dirToTarget, this.chargeSpeed, this.velocity);
                    this.charged = true;

                    if (!(window as any).game.inReplayMode) {
                        const audio = new Audio("/ancientgeese/assets/audio/charge.wav");
                        audio.play();
                    }

                    const sep = Math.deg2rad * 10;
                    const count = 10;
                    const speed = 100;
                    const size = 30;
                    const timeAlive = 10;
                    for (let i = 0; i < count / 2; ++i) {
                        const p = this.spawnProjectile(Vec2.rotate(this.velocity, i * sep));
                        Vec2.normalize(p.dir, p.dir);
                        p.speed = speed;
                        Vec2.set(size, size, p.collider.size);
                        p.timeAlive = timeAlive;
                    }
                    for (let i = 0; i < count / 2; ++i) {
                        const p = this.spawnProjectile(Vec2.rotate(this.velocity, -i * sep));
                        Vec2.normalize(p.dir, p.dir);
                        p.speed = speed;
                        Vec2.set(size, size, p.collider.size);
                        p.timeAlive = timeAlive;
                    }
                }

                if (Vec2.sqrdMagnitude(this.velocity) < 50 * 50) {
                    if (rand() > 0.5)
                        this.enterWalk(rand);
                    else
                        this.enterScream(rand);
                }
            }
        }

        if (this.state === "Dash") {
            Vec2.scale(this.velocity, 0.98, this.velocity);
        } else {
            Vec2.scale(this.velocity, 0.7, this.velocity);
        }
    }

    private spawnProjectile(dir: Vec2, lifetime: number = 3) {
        let projectile: Projectile = new EnemyProjectile();

        Vec2.copy(this.position, projectile.position);
        projectile.position.y += 55;
        Vec2.copy(dir, projectile.dir);
        projectile.speed = 100;
        projectile.timeAlive = lifetime;
        Vec2.set(10, 10, projectile.collider.size);

        this.projectiles.buffer.push(projectile);

        return projectile;
    }

    screamTime = 0;
    screamDuration = sprites.boss.scream.duration;
    firstScream = true;

    public enterScream(rand: () => number) {
        this.doSpiralShoot = rand() > 0.5;
        this.waveTimer = this.waveInterval / 1.5;
        this.screamTime = 0;
        this.state = "Scream";

        if (this.dirToTarget.x > 0) this.flipped = true;
        else this.flipped = false;
    }

    destination: Vec2 = Vec2.zero();

    public enterWalk(rand: () => number) {
        const x = rand() * (this.upperBoundX - this.lowerBoundX) + this.lowerBoundX;
        const y = rand() * (this.upperBoundY - this.lowerBoundY) + this.lowerBoundY;
        Vec2.set(x, y, this.destination);
        this.state = "Walk";

        if (this.dirToTarget.x > 0) this.flipped = true;
        else this.flipped = false;
    }

    chargeWindUpTime = 0;
    chargeWindUpDuration = sprites.boss.chargeWindUp.duration;
    charged = false;
    chargeSpeed = 800;

    get isCharging() {
        return this.state === "Dash" && this.chargeWindUpTime > this.chargeWindUpDuration;
    }

    target: Vec2 = Vec2.zero();
    dirToTarget: Vec2 = Vec2.zero();

    public enterDash() {
        this.chargeWindUpTime = 0;
        this.charged = false;
        this.state = "Dash";

        if (this.dirToTarget.x > 0) this.flipped = true;
        else this.flipped = false;
    }

    public draw(time: number, dt: number, ctx: CanvasRenderingContext2D) {
        const scale = 1.4;
        const offsetY = 55;

        const xscale = this.flipped ? -1 : 1;
        const offsetX = -15 * xscale;

        if (this.state === "Scream") {
            this.screamTime += dt;
            let t = this.screamTime;
            if (t > sprites.boss.scream.duration) t = sprites.boss.scream.duration;
            drawImage(ctx, sprites.boss.scream.get(t), this.position.x + offsetX, this.position.y + offsetY, xscale * scale, scale);
        } else if (this.state === "Walk") {
            drawImage(ctx, sprites.boss.walk.get(time), this.position.x + offsetX, this.position.y + offsetY, xscale * scale, scale);
        } else if (this.state === "Dash") {
            this.chargeWindUpTime += dt;
            if (this.chargeWindUpTime < this.chargeWindUpDuration) {
                drawImage(ctx, sprites.boss.chargeWindUp.get(this.chargeWindUpTime), this.position.x + offsetX, this.position.y + offsetY, xscale * scale, scale);
            } else {
                drawImage(ctx, sprites.boss.charge, this.position.x + offsetX, this.position.y + offsetY, xscale * scale, scale);
            }
        }
    }

    private integrate(dt: number) {
        Vec2.add(this.position, Vec2.scale(this.velocity, dt, this.acceleration), this.position);
        Vec2.copy(this.position, this.collider.position);
        Vec2.copy(this.position, this.hurtbox.position);
        Vec2.copy(this.position, this.damagebox.position);

        this.hurtbox.position.y += 55;
        this.damagebox.position.y += 20;
    }
}