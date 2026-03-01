import { CSRID as CRSID } from "../crsid.asl";
import { DoubleBuffer } from "../doubleBuffer.asl";
import { drawDuck, drawImage, drawStatue, drawText } from "../drawing.asl";
import { Game } from "../game.asl";
import { ControllerInput } from "../input/controller.asl";
import { InputProvider } from "../input/inputProvider.asl";
import { InputRecorder, ReplayController } from "../input/replayController.asl";
import { Bezier } from "../math/bezier.asl";
import { BoxCollider, isColliding } from "../math/physics.asl";
import { Vec2 } from "../math/vector.asl";
import { xor } from "../rand.asl";
import { Camera, Renderer } from "../renderer.asl";
import { sprites } from "../sprites.asl";
import { Boss } from "./boss.asl";
import { BASE_OFFSET as PLAYER_OFFSET, Player, PLAYER_SCALE } from "./player.asl";
import { EnemyProjectile, Projectile } from "./projectile.asl";
import { GameState } from "./savestate.asl";


class GameplayState {
    protected renderer: Renderer;
    protected gameplay: Gameplay;

    constructor(gameplay: Gameplay, renderer: Renderer) {
        this.gameplay = gameplay;
        this.renderer = renderer;
    }

    public enter(...args: any[]) {
    }

    public tick(dt: number) {
    }

    public draw(time: number, dt: number) {
    }
}

class GameplayEnter extends GameplayState {
    constructor(gameplay: Gameplay, renderer: Renderer) {
        super(gameplay, renderer)
    }

    private state: "Enter" | "Welcome" | "ClassReveal" | "Exit" = "Enter";
    private timer: number = 0;
    private bobTimer: number = 0;
    private gameState: GameState | undefined = undefined;

    public enter(gameState: GameState) {
        this.gameplay.game.mode = "Gameplay";
        this.gameplay.state = "Enter";
        this.gameplay.gameState = gameState;
        this.gameState = this.gameplay.gameState;

        this.state = "Enter";
        this.timer = 0;
    }

    private enterDuration = 1.5;
    private duckEnterCurve = Bezier(0.09, 0.14, 0.59, 0.95);

    private welcomeDuration = 1.5;

    private classDuration = 5;

    private exitDuration = 1.5;
    private duckExitCurve = Bezier(0.19, -0.01, 0.74, -0.05);

    public draw(time: number, dt: number) {
        if (!this.gameState) throw new Error("No gameState!");

        const ctx = this.renderer.ctx;
        const camera = this.gameplay.camera;
        const { crsid } = this.gameState;

        Vec2.zero(camera.position);

        {
            const w = this.renderer.canvas.width;
            const hx = w / 2;
            const h = this.renderer.canvas.height;
            const hy = h / 2;

            ctx.fillStyle = "black";
            ctx.fillRect(camera.position.x - hx, camera.position.y - hy, w, h);
        }

        this.timer += dt;
        this.bobTimer += dt;

        let bobY = -Math.sin(this.bobTimer + Math.PI / 2) * 15;
        let bobIdx = Math.floor((time * 2) % 4);
        if (this.state === "Welcome" || this.state === "ClassReveal") {
            drawDuck(ctx, sprites.duck, time, bobIdx, 0, bobY, 2);
        }

        if (this.state === "Enter") {
            const t = Math.clamp01(this.timer / this.enterDuration);

            // Animated duck
            let idx = Math.floor((time * 2) % 4);
            const y = (1 - this.duckEnterCurve(t)) * 300 - 15;
            drawDuck(ctx, sprites.duck, time, idx, 0, y, 2);

            if (this.timer > this.enterDuration) {
                this.state = "Welcome";
                this.timer = 0;
                this.bobTimer = 0;
            }
        } else if (this.state === "Welcome") {
            const t = Math.clamp01(this.timer / this.welcomeDuration);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${t})`;
            drawText(ctx, `Welcome ${crsid.name} of ${crsid.college}...`, 0, 75);

            if (this.timer > this.welcomeDuration) {
                this.state = "ClassReveal";
                this.timer = 0;
            }
        } else if (this.state === "ClassReveal") {
            const t = Math.clamp01(this.timer / this.classDuration * 2);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgb(255, 255, 255)`;
            drawText(ctx, `Welcome ${crsid.name} of ${crsid.college}...`, 0, 75);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${t})`;
            drawText(ctx, `LORE LORE LORE!`, 0, -75);
            drawText(ctx, `You are a ${crsid.classname}!`, 0, -100);

            ctx.globalAlpha = t;
            if (crsid.body !== "none") drawDuck(ctx, sprites.body[crsid.body], time, bobIdx, 0, bobY, 2);
            if (crsid.hat !== "none") drawDuck(ctx, sprites.hat[crsid.hat], time, bobIdx, 0, bobY, 2);
            ctx.globalAlpha = 1;

            if (this.timer > this.classDuration) {
                this.state = "Exit";
                this.timer = 0;
            }
        } else if (this.state === "Exit") {
            const t = Math.clamp01(this.timer / this.exitDuration);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${1 - t})`;
            drawText(ctx, `Welcome ${crsid.name} of ${crsid.college}...`, 0, 75);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${1 - t})`;
            drawText(ctx, `LORE LORE LORE!`, 0, -75);
            drawText(ctx, `You are a ${crsid.classname}!`, 0, -100);

            // Animated duck
            let idx = Math.floor((time * 2) % 4);
            const y = - this.duckExitCurve(t) * 300;
            drawDuck(ctx, sprites.duck, time, idx, 0, y, 2);
            if (crsid.body !== "none") drawDuck(ctx, sprites.body[crsid.body], time, idx, 0, y, 2);
            if (crsid.hat !== "none") drawDuck(ctx, sprites.hat[crsid.hat], time, idx, 0, y, 2);

            if (this.timer > this.exitDuration) {
                this.gameplay.gameplayPlay.enter(this.gameState);
            }
        }
    }
}

export class GameplayPlay extends GameplayState {
    private gameState: GameState | undefined = undefined;
    private inputProvider: InputProvider = undefined!;
    private inputRecorder: InputRecorder = undefined!;

    constructor(gameplay: Gameplay, renderer: Renderer) {
        super(gameplay, renderer);
    }

    private state: "Enter" | "Idle" | "Fight" | "Win" | "Lose" | "Freeze" | "Exit" = "Enter";

    public rand: () => number = undefined!;

    public enter(gameState: GameState): void {
        this.gameplay.game.mode = "Gameplay";
        this.gameplay.gameState = gameState;
        this.gameplay.state = "Play";
        this.gameState = gameState;
        this.inputProvider = this.gameState.frames ? new ReplayController(this.gameState.frames) : new ControllerInput();
        this.inputRecorder = new InputRecorder();

        gameState.deadBodies.sort((a, b) => b.position.y - a.position.y);

        this.rand = xor(gameState.rngSeed);

        this.state = "Enter";
        this.timer = 0;

        const camera = this.gameplay.camera;
        this.gapUpperBound = camera.size.y * 1 + camera.size.y / 2;
        this.gapLowerBound = camera.size.y * 1 - camera.size.y / 2;

        this.playerProjectiles.clear();
        this.enemyProjectiles.clear();
        this.deadBodyObstructions.clear();

        for (const d of gameState.deadBodies) {
            if (d.isBroken) continue;

            const collider = new BoxCollider();
            Vec2.set(20, 10, collider.size);
            Vec2.copy(d.position, collider.position);
            collider.update();

            const hurtbox = new BoxCollider();
            Vec2.set(20, 30, hurtbox.size);
            Vec2.copy(d.position, hurtbox.position);
            hurtbox.position.y += 10;
            hurtbox.update();

            this.deadBodyObstructions.buffer.push({ collider, hurtbox, ref: d });
        }

        this.gapPlatforms.length = 0;
        {
            const collider = new BoxCollider();
            Vec2.set(0, camera.size.y * 1 - 150, collider.position);
            Vec2.set(300, 100, collider.size);
            this.gapPlatforms.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(0, camera.size.y * 1 - 150, collider.position);
            Vec2.set(350, 50, collider.size);
            this.gapPlatforms.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(0, camera.size.y * 1 - 75, collider.position);
            Vec2.set(270, 50, collider.size);
            this.gapPlatforms.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(0, camera.size.y * 1 - 55, collider.position);
            Vec2.set(200, 50, collider.size);
            this.gapPlatforms.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(0, camera.size.y * 1 + 30, collider.position);
            Vec2.set(200, 50, collider.size);
            this.gapPlatforms.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(0, camera.size.y * 1 + 120, collider.position);
            Vec2.set(180, 150, collider.size);
            this.gapPlatforms.push(collider);
        }

        this.obstructions.length = 0;
        {
            const collider = new BoxCollider();
            Vec2.set(-camera.size.x / 2 + 70, camera.size.y * 2 + 85, collider.position);
            Vec2.set(70, 50, collider.size);
            this.obstructions.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(-camera.size.x / 2 + 70, camera.size.y * 2 + 85, collider.position);
            Vec2.set(70, 50, collider.size);
            this.obstructions.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(camera.size.x / 2 - 60, camera.size.y * 2 + 75, collider.position);
            Vec2.set(50, 60, collider.size);
            this.obstructions.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(20, camera.size.y * 2 + 95, collider.position);
            Vec2.set(45, 20, collider.size);
            this.obstructions.push(collider);
        }
        {
            const collider = new BoxCollider();
            Vec2.set(215, 120, collider.position);
            Vec2.set(130, 130, collider.size);
            this.obstructions.push(collider);
        }

        Vec2.zero(this.gameplay.camera.position);
        Vec2.zero(this.targetCameraPosition);
        this.player.reset();
        this.boss.reset(camera, this.enemyProjectiles);

        this.initFight = false;
    }

    initFight: boolean = false;

    tickIdx: number = 0;
    targetCameraPosition: Vec2 = Vec2.zero();

    gapLowerBound: number = 0;
    gapUpperBound: number = 0;

    gapPlatforms: BoxCollider[] = [];

    obstructions: BoxCollider[] = [];

    deadBodyObstructions: DoubleBuffer<{ collider: BoxCollider, hurtbox: BoxCollider, ref: GameState["deadBodies"][number] }> = new DoubleBuffer();

    playerProjectiles: DoubleBuffer<Projectile> = new DoubleBuffer();

    enemyProjectiles: DoubleBuffer<EnemyProjectile> = new DoubleBuffer();

    timeInFight = 0;

    public tick(dt: number) {
        if (this.gameState === undefined) throw new Error("No game state!");
        if (this.state !== "Idle" && this.state !== "Fight") return;

        ++this.tickIdx;
        const inputState = this.inputProvider.getInput(this.tickIdx);
        this.inputRecorder.push(this.tickIdx, inputState);

        const camera = this.gameplay.camera;
        const { player } = this;

        // What screen the player is on
        const screenIdx = Math.floor((player.position.y + camera.size.y / 2) / camera.size.y);

        let canTakeDamage = this.player.invincibleTimer <= 0 && !this.player.isDodging;

        // update boss
        if (this.state === "Fight") {
            if (!this.initFight) {
                this.boss.screamTime = 0;
                this.initFight = true;
                this.timeInFight = 0;
            }

            this.timeInFight += dt;
            if (this.timeInFight > 60) {
                this.lose("Lose");
                return;
            }

            Vec2.copy(player.position, this.boss.target);
            this.boss.tick(dt, this.rand);

            {
                const upperBound = camera.size.y * 2 + camera.size.y / 2 - 100;
                const lowerBound = camera.size.y * 2 - camera.size.y / 2 + 45;
                if (this.boss.position.y > upperBound) {
                    this.boss.position.y = upperBound;
                    if (this.boss.velocity.y > 0) this.boss.velocity.y = 0;
                } else if (this.boss.position.y < lowerBound) {
                    this.boss.position.y = lowerBound;
                    if (this.boss.velocity.y < 0) this.boss.velocity.y = 0;
                }
            }
            {
                const upperBound = camera.size.x / 2 - 70;
                const lowerBound = -camera.size.x / 2 + 70;
                if (this.boss.position.x > upperBound) {
                    this.boss.position.x = upperBound;
                    if (this.boss.velocity.x > 0) this.boss.velocity.x = 0;
                } else if (this.boss.position.x < lowerBound) {
                    this.boss.position.x = lowerBound;
                    if (this.boss.velocity.x < 0) this.boss.velocity.x = 0;
                }
            }

            for (const obstruction of this.obstructions) {
                const result = isColliding(this.boss.collider, obstruction);
                if (result) {
                    Vec2.add(this.boss.position, Vec2.scale(result.normal, result.penetrationDistance, result.normal), this.boss.position);
                }
            }

            for (const p of this.playerProjectiles.buffer) {
                if (isColliding(p.collider, this.boss.hurtbox)) {
                    p.timeAlive = 0;
                    // TODO: hit effect
                    this.gameState.bossHealth -= p.damage;
                } else {
                    // dead body collision
                    for (const { hurtbox, ref } of this.deadBodyObstructions.buffer) {
                        if (isColliding(p.collider, hurtbox)) {
                            p.timeAlive = 0;
                            ref.health -= 1;
                        }
                    }
                }
            }

            if (canTakeDamage && this.boss.isCharging && isColliding(this.boss.damagebox, this.player.hurtbox)) {
                this.player.health -= 1;
                this.player.invincibleTimer = 1.5;
                canTakeDamage = false;
                if (this.player.health <= 0) {
                    this.lose("Lose");
                    return;
                }
            }

            if (this.boss.isCharging) {
                // dead body collision
                for (const { collider, ref } of this.deadBodyObstructions.buffer) {
                    if (isColliding(this.boss.damagebox, collider)) {
                        ref.health = 0;
                    }
                }
            }

            for (const p of this.enemyProjectiles.buffer) {
                if (canTakeDamage && isColliding(p.collider, this.player.hurtbox)) {
                    p.timeAlive = 0;
                    this.player.health -= 1;
                    this.player.invincibleTimer = 1.5;
                    canTakeDamage = false;
                    if (this.player.health <= 0) {
                        this.lose("Lose");
                        return;
                    }
                } else {
                    // dead body collision
                    for (const { hurtbox, ref } of this.deadBodyObstructions.buffer) {
                        if (isColliding(p.collider, hurtbox)) {
                            p.timeAlive = 0;
                        }
                    }
                }
                p.tick(dt);
                if (p.timeAlive > 0) this.enemyProjectiles.push(p);
            }
            this.enemyProjectiles.swap();

            Vec2.copy(this.boss.position, player.target);
            player.target.y += 50;
            player.lock = true;
        } else {
            player.lock = false;
        }

        // update player
        player.tick(dt, inputState);

        if (!this.player.isFalling) {
            for (const obstruction of this.obstructions) {
                const result = isColliding(this.player.collider, obstruction);
                if (result) {
                    Vec2.add(this.player.position, Vec2.scale(result.normal, result.penetrationDistance, result.normal), this.player.position);
                }
            }

            // dead body collision
            for (const { collider, ref } of this.deadBodyObstructions.buffer) {
                const result = isColliding(this.player.collider, collider);
                if (result) {
                    Vec2.add(this.player.position, Vec2.scale(result.normal, result.penetrationDistance, result.normal), this.player.position);
                }
            }

            // boss collision
            if (!this.player.isDodging) {
                const result = isColliding(this.player.collider, this.boss.collider);
                if (result) {
                    Vec2.add(this.player.position, Vec2.scale(result.normal, result.penetrationDistance, result.normal), this.player.position);
                }
            }
        }

        // Fight state
        if (!player.isFalling) {
            player.shooting(dt, inputState, this.gameState.crsid, this.playerProjectiles, this.rand);
        }
        for (const p of this.playerProjectiles.buffer) {
            p.tick(dt);
            if (p.timeAlive > 0) this.playerProjectiles.push(p);
        }
        this.playerProjectiles.swap();

        // dead body collision
        for (const d of this.deadBodyObstructions.buffer) {
            const { collider, ref } = d;
            if (ref.health > 0) this.deadBodyObstructions.push(d);
            else ref.isBroken = true;
        }
        this.deadBodyObstructions.swap();

        // Gap
        if (!this.player.isDodging && this.state !== "Fight") {
            if (player.position.y > this.gapLowerBound && player.position.y < this.gapUpperBound) {
                let isOnPlatform = false;
                for (const platform of this.gapPlatforms) {
                    if (isColliding(this.player.collider, platform)) {
                        isOnPlatform = true;
                        break;
                    }
                }
                if (!isOnPlatform) {
                    player.isFalling = true;
                }
            }
        }

        // Borders
        {
            let upperBound = camera.size.y * 2 + camera.size.y / 2 - 80;
            let lowerBound = -camera.size.y / 2 + 10;
            if (screenIdx === 2) {
                lowerBound = camera.size.y * 2 - camera.size.y / 2 + 10;
                this.state = "Fight";
            }
            if (player.position.y > upperBound) {
                player.position.y = upperBound;
            } else if (player.position.y < lowerBound) {
                player.position.y = lowerBound;
            }
        }
        {
            const upperBound = camera.size.x / 2 - 45;
            const lowerBound = -camera.size.x / 2 + 45;
            if (player.position.x > upperBound) {
                player.position.x = upperBound;
            } else if (player.position.x < lowerBound) {
                player.position.x = lowerBound;
            }
        }

        // Move camera to screen index
        this.targetCameraPosition.y = screenIdx * camera.size.y;
        Vec2.lerp(camera.position, this.targetCameraPosition, 5 * dt, camera.position);
    }

    private timer = 0;
    private enterDuration = 1.5;

    private duckEnterCurve = Bezier(0.09, 0.14, 0.59, 0.95);

    private player: Player = new Player();
    private boss: Boss = new Boss();

    public draw(time: number, dt: number) {
        if (!this.gameState) throw new Error("No gameplay save state!");

        const { crsid } = this.gameState;

        const ctx = this.renderer.ctx;
        const camera = this.gameplay.camera;

        {
            const w = this.renderer.canvas.width / camera.scaleFactor;
            const hx = w / 2;
            const h = this.renderer.canvas.height / camera.scaleFactor;
            const hy = h / 2;

            ctx.fillStyle = "black";
            ctx.fillRect(camera.position.x - hx, camera.position.y - hy, w, h);
        }

        if (this.state !== "Fight")
            this.timer += dt;

        // draw background
        {
            const scale = 4;
            drawImage(ctx, sprites.backgrounds.lobby, 0, 0, scale, scale);
            drawImage(ctx, sprites.backgrounds.bridge, 0, camera.size.y, scale, scale);
            drawImage(ctx, sprites.backgrounds.arena, 0, camera.size.y * 2, scale, scale);
        }

        // Draw projectiles
        let playerProjIdx = 0;
        this.playerProjectiles.buffer.sort((a, b) => b.position.y - a.position.y);

        let enemyProjIdx = 0;
        this.enemyProjectiles.buffer.sort((a, b) => b.position.y - a.position.y);

        let deadBodyIdx = 0;
        const deadBodies = this.gameState.deadBodies;

        while (playerProjIdx < this.playerProjectiles.buffer.length) {
            if (this.playerProjectiles.buffer[playerProjIdx].position.y < this.boss.position.y ||
                this.playerProjectiles.buffer[playerProjIdx].position.y < this.player.position.y) break;
            this.playerProjectiles.buffer[playerProjIdx].draw(ctx, time, dt, crsid);
            ++playerProjIdx;
        }
        while (enemyProjIdx < this.enemyProjectiles.buffer.length) {
            if (this.enemyProjectiles.buffer[enemyProjIdx].position.y - 55 < this.boss.position.y ||
                this.enemyProjectiles.buffer[enemyProjIdx].position.y < this.player.position.y) break;
            this.enemyProjectiles.buffer[enemyProjIdx].draw(ctx, time, dt, crsid);
            ++enemyProjIdx;
        }
        while (deadBodyIdx < deadBodies.length) {
            if (deadBodies[deadBodyIdx].position.y < this.player.position.y ||
                deadBodies[deadBodyIdx].position.y < this.boss.position.y) break;
            this.drawDeadBody(time, dt, ctx, deadBodies[deadBodyIdx]);
            ++deadBodyIdx;
        }

        if (this.boss.position.y > this.player.position.y) {
            this.drawBoss(time, dt, ctx);

            while (playerProjIdx < this.playerProjectiles.buffer.length) {
                if (this.playerProjectiles.buffer[playerProjIdx].position.y < this.player.position.y) break;
                this.playerProjectiles.buffer[playerProjIdx].draw(ctx, time, dt, crsid);
                ++playerProjIdx;
            }
            while (enemyProjIdx < this.enemyProjectiles.buffer.length) {
                if (this.enemyProjectiles.buffer[enemyProjIdx].position.y < this.player.position.y) break;
                this.enemyProjectiles.buffer[enemyProjIdx].draw(ctx, time, dt, crsid);
                ++enemyProjIdx;
            }
            while (deadBodyIdx < deadBodies.length) {
                if (deadBodies[deadBodyIdx].position.y < this.player.position.y) break;
                this.drawDeadBody(time, dt, ctx, deadBodies[deadBodyIdx]);
                ++deadBodyIdx;
            }

            this.drawPlayer(time, dt, ctx, crsid);
        } else {
            this.drawPlayer(time, dt, ctx, crsid);

            while (playerProjIdx < this.playerProjectiles.buffer.length) {
                if (this.playerProjectiles.buffer[playerProjIdx].position.y < this.boss.position.y) break;
                this.playerProjectiles.buffer[playerProjIdx].draw(ctx, time, dt, crsid);
                ++playerProjIdx;
            }
            while (enemyProjIdx < this.enemyProjectiles.buffer.length) {
                if (this.enemyProjectiles.buffer[enemyProjIdx].position.y - 55 < this.boss.position.y) break;
                this.enemyProjectiles.buffer[enemyProjIdx].draw(ctx, time, dt, crsid);
                ++enemyProjIdx;
            }
            while (deadBodyIdx < deadBodies.length) {
                if (deadBodies[deadBodyIdx].position.y < this.boss.position.y) break;
                this.drawDeadBody(time, dt, ctx, deadBodies[deadBodyIdx]);
                ++deadBodyIdx;
            }

            this.drawBoss(time, dt, ctx);
        }

        while (playerProjIdx < this.playerProjectiles.buffer.length) {
            this.playerProjectiles.buffer[playerProjIdx].draw(ctx, time, dt, crsid);
            ++playerProjIdx;
        }
        while (enemyProjIdx < this.enemyProjectiles.buffer.length) {
            this.enemyProjectiles.buffer[enemyProjIdx].draw(ctx, time, dt, crsid);
            ++enemyProjIdx;
        }
        while (deadBodyIdx < deadBodies.length) {
            this.drawDeadBody(time, dt, ctx, deadBodies[deadBodyIdx]);
            ++deadBodyIdx;
        }

        // Debugging
        if (false) {
            this.player.collider.draw(ctx);
            this.player.hurtbox.draw(ctx, "rgb(255, 0, 0)");

            this.boss.collider.draw(ctx);
            this.boss.hurtbox.draw(ctx, "rgb(255, 0, 0)");
            this.boss.damagebox.draw(ctx, "rgb(255, 0, 0)");

            {
                ctx.beginPath();
                ctx.moveTo(-camera.size.x / 2, this.boss.lowerBoundY);
                ctx.lineTo(camera.size.x / 2, this.boss.lowerBoundY);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-camera.size.x / 2, this.boss.upperBoundY);
                ctx.lineTo(camera.size.x / 2, this.boss.upperBoundY);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(this.boss.lowerBoundX, camera.size.y * 2 + -camera.size.y / 2);
                ctx.lineTo(this.boss.lowerBoundX, camera.size.y * 2 + camera.size.y / 2);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(this.boss.upperBoundX, camera.size.y * 2 + -camera.size.x / 2);
                ctx.lineTo(this.boss.upperBoundX, camera.size.y * 2 + camera.size.x / 2);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(this.boss.destination.x, this.boss.destination.y, 10, 0, Math.PI * 2);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();
            }

            // Bridge gap
            {
                ctx.beginPath();
                ctx.moveTo(-camera.size.x / 2, this.gapUpperBound);
                ctx.lineTo(camera.size.x / 2, this.gapUpperBound);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-camera.size.x / 2, this.gapLowerBound);
                ctx.lineTo(camera.size.x / 2, this.gapLowerBound);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();

                for (const collider of this.gapPlatforms) {
                    collider.draw(ctx);
                }

                for (const collider of this.obstructions) {
                    collider.draw(ctx);
                }
            }

            // projectiles
            {
                for (const p of this.playerProjectiles.buffer) {
                    p.collider.draw(ctx);
                }

                for (const p of this.enemyProjectiles.buffer) {
                    p.collider.draw(ctx);
                }

                for (const p of this.deadBodyObstructions.buffer) {
                    p.collider.draw(ctx);
                    p.hurtbox.draw(ctx, "rgb(255, 0, 0)");
                }
            }
        }

        if (this.state === "Enter") {
            const t = Math.clamp01(this.timer / this.enterDuration);

            {
                const w = this.renderer.canvas.width / camera.scaleFactor;
                const hx = w / 2;
                const h = this.renderer.canvas.height / camera.scaleFactor;
                const hy = h / 2;

                ctx.fillStyle = `rgba(0, 0, 0, ${1 - t})`;
                ctx.fillRect(camera.position.x - hx, camera.position.y - hy, w, h);
            }

            const y = (1 - this.duckEnterCurve(t)) * 300 + this.player.offset;

            drawDuck(ctx, sprites.duck, time, this.player.idx, this.player.position.x, this.player.position.y + y, PLAYER_SCALE);
            if (crsid.body !== "none") drawDuck(ctx, sprites.body[crsid.body], time, this.player.idx, this.player.position.x, this.player.position.y + y, PLAYER_SCALE);
            if (crsid.hat !== "none") drawDuck(ctx, sprites.hat[crsid.hat], time, this.player.idx, this.player.position.x, this.player.position.y + y, PLAYER_SCALE);

            if (this.timer > this.enterDuration) {
                this.state = "Idle";
                this.timer = 0;
                this.tickIdx = 0;
            }
        } else if (this.state === "Lose") {
            const t = Math.clamp01(this.timer / this.loseDuration);

            {
                const w = this.renderer.canvas.width / camera.scaleFactor;
                const hx = w / 2;
                const h = this.renderer.canvas.height / camera.scaleFactor;
                const hy = h / 2;

                ctx.fillStyle = `rgba(0, 0, 0, ${t})`;
                ctx.fillRect(camera.position.x - hx, camera.position.y - hy, w, h);
            }

            let scale = PLAYER_SCALE;
            let idx = this.player.idx;
            let isIdle = true;
            let offset = this.player.offset;

            drawDuck(ctx, sprites.duck, 0, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            if (crsid.body !== "none") drawDuck(ctx, sprites.body[crsid.body], 0, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            if (crsid.hat !== "none") drawDuck(ctx, sprites.hat[crsid.hat], 0, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);

            if (this.timer > this.loseDuration) {
                this.state = "Freeze";
                this.timer = 0;
            }
        } else if (this.state === "Freeze") {
            {
                const w = this.renderer.canvas.width / camera.scaleFactor;
                const hx = w / 2;
                const h = this.renderer.canvas.height / camera.scaleFactor;
                const hy = h / 2;

                ctx.fillStyle = `rgba(0, 0, 0, 1)`;
                ctx.fillRect(camera.position.x - hx, camera.position.y - hy, w, h);
            }

            // TODO freeze animation

            let scale = PLAYER_SCALE;
            let idx = this.player.idx;
            let isIdle = true;
            let offset = this.player.offset;

            drawDuck(ctx, sprites.statue, Math.clamp(this.timer, 0, this.freezeDuration - 0.01), idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            if (crsid.body !== "none") drawDuck(ctx, sprites.body[crsid.body], 0, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            if (crsid.hat !== "none") drawDuck(ctx, sprites.hat[crsid.hat], 0, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);

            if (this.timer >= this.freezeDuration) {
                this.timer = 0;
                this.state = "Exit";
            }
        } else if (this.state === "Exit") {
            const t = Math.clamp01(this.timer / this.exitDuration);

            {
                const w = this.renderer.canvas.width / camera.scaleFactor;
                const hx = w / 2;
                const h = this.renderer.canvas.height / camera.scaleFactor;
                const hy = h / 2;

                ctx.fillStyle = `rgba(0, 0, 0, 1)`;
                ctx.fillRect(camera.position.x - hx, camera.position.y - hy, w, h);
            }

            let scale = PLAYER_SCALE;
            let idx = this.player.idx;
            let isIdle = false;
            let offset = this.player.offset;

            ctx.globalAlpha = 1 - t;
            drawDuck(ctx, sprites.statue, 0, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            if (crsid.body !== "none") drawDuck(ctx, sprites.body[crsid.body], 0, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            if (crsid.hat !== "none") drawDuck(ctx, sprites.hat[crsid.hat], 0, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            ctx.globalAlpha = 1;

            if (this.timer > this.exitDuration) {
                this.lose("Exit");
            }
        }
    }

    public uiDraw() {
        const ctx = this.renderer.ctx;
        const canvas = this.renderer.canvas;

        if (this.state === "Fight") {
            const t = Math.clamp01(this.timeInFight / 1);

            let timeLeft = 60 - this.timeInFight;
            if (timeLeft < 0) timeLeft = 0;
            ctx.font = `25px INET`;
            ctx.fillStyle = `rgba(255, 255, 255, ${t})`;

            ctx.save()
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(this.gameplay.camera.scaleFactor, -this.gameplay.camera.scaleFactor)
            drawText(ctx, `${timeLeft.toFixed(2)}`, 240, 150);
            ctx.restore();
        }
    }

    private drawBoss(time: number, dt: number, ctx: CanvasRenderingContext2D) {
        this.boss.draw(time, dt, ctx);
    }

    private drawDeadBody(time: number, dt: number, ctx: CanvasRenderingContext2D, deadBody: GameState["deadBodies"][number]) {
        time = deadBody.isBroken ? 0.99 : 0;
        drawStatue(ctx, time, deadBody.idx, deadBody.position.x, deadBody.position.y + PLAYER_OFFSET, PLAYER_SCALE);
        if (deadBody.isBroken) return;
        if (deadBody.crsid.body !== "none") drawDuck(ctx, sprites.body[deadBody.crsid.body], time, deadBody.idx, deadBody.position.x, deadBody.position.y + PLAYER_OFFSET, PLAYER_SCALE);
        if (deadBody.crsid.hat !== "none") drawDuck(ctx, sprites.hat[deadBody.crsid.hat], time, deadBody.idx, deadBody.position.x, deadBody.position.y + PLAYER_OFFSET, PLAYER_SCALE);
    }

    private drawPlayer(time: number, dt: number, ctx: CanvasRenderingContext2D, crsid: CRSID) {
        if (this.state === "Lose") return;

        if (this.player.invincibleTimer > 0) {
            if (Math.sin(this.player.invincibleTimer * 20) > 0) return;
        }

        if (!this.player.isFalling) {
            // draw shadow
            ctx.save();
            ctx.translate(this.player.position.x, this.player.position.y);
            ctx.scale(1, 0.5);
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fill();
            ctx.restore();

            // draw hearts
            if (this.state === "Fight") {
                const scale = 0.65;
                for (let i = 0; i < 3; ++i) {
                    drawImage(ctx, this.player.health > i ? sprites.ui.heart : sprites.ui.emptyheart, this.player.position.x + i * 10 - 10, this.player.position.y - 15, scale, scale);
                }
            }
        }

        if (this.state !== "Enter") {
            let scale = PLAYER_SCALE;
            let idx = this.player.idx;
            let isIdle = this.player.isIdle;
            let offset = this.player.offset;

            if (this.player.isFalling) {
                isIdle = true;
                this.player.fallingTimer += dt;

                const t = Math.clamp01(this.player.fallingTimer / this.player.fallingDuration);
                idx = Math.floor(this.player.idx + 16 * t) % 4;

                scale = PLAYER_SCALE * (1 - t);
                offset = this.player.offset * (1 - t) - t * 5;

                if (this.player.fallingTimer > this.player.fallingDuration) {
                    this.lose("Exit");
                }
            }

            drawDuck(ctx, sprites.duck, time, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            if (crsid.body !== "none") drawDuck(ctx, sprites.body[crsid.body], time, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
            if (crsid.hat !== "none") drawDuck(ctx, sprites.hat[crsid.hat], time, idx, this.player.position.x, this.player.position.y + offset, scale, isIdle);
        }
    }

    freezeDuration = sprites.statue.topLeftIdle.duration;
    loseDuration = 1;
    exitDuration = 1;
    public lose(to: "Exit" | "Lose") {
        if (this.gameState === undefined) throw new Error("No save state!");

        this.state = "Lose";
        this.timer = 0;

        if (to === "Exit") {
            // TODO, add some stat object containing stats like damage done etc...
            //       to pass to gameplayExit and to api/finish req
            if (this.inputProvider instanceof ControllerInput) {
                this.gameState.frames = this.inputRecorder.frames;
                const replay = JSON.stringify(this.gameState);

                this.gameState.frames = undefined;
                if (!this.player.isFalling) {
                    this.gameState.deadBodies.push({
                        crsid: this.gameState.crsid,
                        idx: this.player.idx,
                        isBroken: false,
                        position: Vec2.copy(this.player.position),
                        health: 5,
                    });
                }
                const nextState = JSON.stringify(this.gameState);

                fetch("/ancientgeese/api/finish", {
                    method: "POST",
                    body: JSON.stringify({
                        replay,
                        nextState
                    })
                });
                this.gameplay.gameplayExit.enter(this.gameState);
            } else {
                this.gameplay.gameplayExit.enter(this.gameState);
            }

        }
    }
}

// TODO
class GameplayExit extends GameplayState {
    constructor(gameplay: Gameplay, renderer: Renderer) {
        super(gameplay, renderer)
    }

    private state: "Enter" | "Welcome" | "ClassReveal" | "Exit" = "Enter";
    private timer: number = 0;
    private bobTimer: number = 0;
    private crsid: CRSID | undefined = undefined;

    public enter(gameState: GameState) {
        this.gameplay.game.mode = "Gameplay";
        this.gameplay.state = "Exit"
        this.gameplay.gameState = gameState;
        this.crsid = this.gameplay.gameState.crsid;

        Vec2.zero(this.gameplay.camera.position);

        this.state = "Enter";
        this.timer = 0;
    }

    private enterDuration = 1.5;
    private duckEnterCurve = Bezier(0.09, 0.14, 0.59, 0.95);

    private welcomeDuration = 1.5;

    private classDuration = 5;

    private exitDuration = 1.5;
    private duckExitCurve = Bezier(0.19, -0.01, 0.74, -0.05);

    public draw(time: number, dt: number) {
        if (!this.crsid) throw new Error("No crsid!");

        const ctx = this.renderer.ctx;
        const camera = this.gameplay.camera;

        Vec2.zero(camera.position);

        {
            const w = this.renderer.canvas.width;
            const hx = w / 2;
            const h = this.renderer.canvas.height;
            const hy = h / 2;

            ctx.fillStyle = "black";
            ctx.fillRect(camera.position.x - hx, camera.position.y - hy, w, h);
        }

        this.timer += dt;
        this.bobTimer += dt;

        let bobY = -Math.sin(this.bobTimer + Math.PI / 2) * 15;
        let bobIdx = Math.floor((time * 2) % 4);
        if (this.state === "Welcome" || this.state === "ClassReveal") {
            drawDuck(ctx, sprites.duck, time, bobIdx, 0, bobY, 2);
            if (this.crsid.body !== "none") drawDuck(ctx, sprites.body[this.crsid.body], time, bobIdx, 0, bobY, 2);
            if (this.crsid.hat !== "none") drawDuck(ctx, sprites.hat[this.crsid.hat], time, bobIdx, 0, bobY, 2);
        }

        if (this.state === "Enter") {
            const t = Math.clamp01(this.timer / this.enterDuration);

            // Animated duck
            let idx = Math.floor((time * 2) % 4);
            const y = (1 - this.duckEnterCurve(t)) * 300 - 15;
            drawDuck(ctx, sprites.duck, time, idx, 0, y, 2);
            if (this.crsid.body !== "none") drawDuck(ctx, sprites.body[this.crsid.body], time, idx, 0, y, 2);
            if (this.crsid.hat !== "none") drawDuck(ctx, sprites.hat[this.crsid.hat], time, idx, 0, y, 2);

            if (this.timer > this.enterDuration) {
                this.state = "Welcome";
                this.timer = 0;
                this.bobTimer = 0;
            }
        } else if (this.state === "Welcome") {
            const t = Math.clamp01(this.timer / this.welcomeDuration);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${t})`;
            drawText(ctx, `In memory of ${this.crsid.name}...`, 0, 75);

            if (this.timer > this.welcomeDuration) {
                this.state = "ClassReveal";
                this.timer = 0;
            }
        } else if (this.state === "ClassReveal") {
            const t = Math.clamp01(this.timer / this.classDuration * 2);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, 1)`;
            drawText(ctx, `In memory of ${this.crsid.name}...`, 0, 75);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${t})`;
            drawText(ctx, `You did X damage!`, 0, -75);
            drawText(ctx, `Some other phrase!`, 0, -100);

            if (this.timer > this.classDuration) {
                this.state = "Exit";
                this.timer = 0;
            }
        } else if (this.state === "Exit") {
            const t = Math.clamp01(this.timer / this.exitDuration);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${1 - t})`;
            drawText(ctx, `In memory of ${this.crsid.name}...`, 0, 75);

            ctx.font = "25px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${1 - t})`;
            drawText(ctx, `You did X damage!`, 0, -75);
            drawText(ctx, `Some other phrase!`, 0, -100);

            // Animated duck
            let idx = Math.floor((time * 2) % 4);
            const y = - this.duckExitCurve(t) * 300;
            drawDuck(ctx, sprites.duck, time, idx, 0, y, 2);
            if (this.crsid.body !== "none") drawDuck(ctx, sprites.body[this.crsid.body], time, idx, 0, y, 2);
            if (this.crsid.hat !== "none") drawDuck(ctx, sprites.hat[this.crsid.hat], time, idx, 0, y, 2);

            if (this.timer > this.exitDuration) {
                this.gameplay.game.menu.enter();
            }
        }
    }
}

export class Gameplay {
    public camera: Camera;
    public renderer: Renderer;

    public game: Game;

    public state: "Enter" | "Play" | "Exit" = "Enter";

    public gameplayEnter: GameplayEnter;
    public gameplayPlay: GameplayPlay;
    public gameplayExit: GameplayExit;

    public gameState: GameState | undefined = undefined;

    constructor(game: Game, renderer: Renderer) {
        this.game = game;
        this.renderer = renderer;
        this.camera = new Camera(this.renderer);

        this.gameplayEnter = new GameplayEnter(this, renderer);
        this.gameplayPlay = new GameplayPlay(this, renderer);
        this.gameplayExit = new GameplayExit(this, renderer);
    }

    public tick(dt: number) {
        switch (this.state) {
            case "Enter":
                this.gameplayEnter.tick(dt);
                break;
            case "Play":
                this.gameplayPlay.tick(dt);
                break;
            case "Exit":
                this.gameplayExit.tick(dt);
                break;
        }
    }

    public draw(time: number, dt: number) {
        this.camera.start();

        // Clear screen
        const ctx = this.renderer.ctx;
        const w = this.renderer.canvas.width / this.camera.scaleFactor;
        const hx = w / 2;
        const h = this.renderer.canvas.height / this.camera.scaleFactor;
        const hy = h / 2;
        ctx.clearRect(this.camera.position.x - hx, this.camera.position.y - hy, w, h);

        switch (this.state) {
            case "Enter":
                this.gameplayEnter.draw(time, dt);
                break;
            case "Play":
                this.gameplayPlay.draw(time, dt);
                break;
            case "Exit":
                this.gameplayExit.draw(time, dt);
                break;
        }

        this.camera.end();

        switch (this.state) {
            case "Play":
                this.gameplayPlay.uiDraw();
                break;
        }
    }
}