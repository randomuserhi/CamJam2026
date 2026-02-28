import { DoubleBuffer } from "./doubleBuffer.asl";
import { InputProvider } from "./input/inputProvider.asl";
import { InputFrame, InputRecorder, ReplayController } from "./input/replayController.asl";
import { BoxCollider, isColliding } from "./math/physics.asl";
import { Vec2 } from "./math/vector.asl";
import { Player } from "./player.asl";
import { Projectile } from "./projectile.asl";
import { xor } from "./rand.asl";
import { Camera, Renderer } from "./renderer.asl";
import { sprites } from "./sprite.asl";

export class GameState {
    public player: Player = new Player(this);

    public playerProjectiles = new DoubleBuffer<Projectile>();

    public enemyProjectiles = new DoubleBuffer<Projectile>();
}

export interface Environment {
    deadBodies: {
        position: Vec2,
        isBroken: boolean,
        name: string
    }[];
}

export interface Replay {
    seed: number;
    frames: InputFrame[];
    env: Environment;
}

export class Game {
    public readonly tickRate = 60;
    public readonly totalFrameTimeS = 1.0 / this.tickRate;
    public readonly totalFrameTimeMs = Math.round(this.totalFrameTimeS * 1000);
    public readonly fixedDeltaTime = this.totalFrameTimeS;

    public readonly renderer: Renderer;
    private readonly camera: Camera;
    private readonly inputProvider: InputProvider;

    public readonly rngSeed: number;
    public readonly rand: () => number;

    public drawColliders: boolean = true;
    public tickIdx = 0;
    public lastFrame = Date.now();

    private targetCameraPosition = Vec2.zero();

    private state: GameState;

    private bridgePlatform = new BoxCollider();
    private gapUpperBound: number;
    private gapLowerBound: number;

    public worldTimer = 0;
    public inputRecorder = new InputRecorder();

    constructor(renderer: Renderer, inputProvider: InputProvider, rngSeed: number) {
        this.renderer = renderer;
        this.camera = new Camera(renderer);
        this.inputProvider = inputProvider;
        this.rngSeed = rngSeed;
        this.rand = xor(this.rngSeed);

        // Init game state
        this.state = new GameState();

        // Bridge
        this.gapUpperBound = this.camera.size.y * 1 + this.camera.size.y / 2 - 10;
        this.gapLowerBound = this.camera.size.y * 1 + this.camera.size.y / 2 - 170;
        Vec2.set(0, this.camera.size.y * 1 + this.camera.size.y / 2 - 90, this.bridgePlatform.position);
        Vec2.set(100, 120, this.bridgePlatform.size);

        Vec2.set(0, this.camera.size.y * 1, this.state.player.position);
    }

    private levelEndTriggered = false;
    private levelEnd() {
        if (this.levelEndTriggered) return;
        this.levelEndTriggered = true;

        if (this.inputProvider instanceof ReplayController) return;
        console.log(JSON.stringify({
            seed: this.rngSeed,
            frames: this.inputRecorder.frames
        }));
    }

    public tick(dt: number) {
        if (this.worldTimer > 60) {
            this.levelEnd();
            return;
        }
        ++this.tickIdx;
        this.worldTimer += dt;

        const inputState = this.inputProvider.getInput(this.tickIdx);
        this.inputRecorder.push(this.tickIdx, inputState);

        const {
            player,
            playerProjectiles
        } = this.state;

        // What screen the player is on
        const screenIdx = Math.floor((player.position.y + this.camera.size.y / 2) / this.camera.size.y);

        // Bridge gap
        {
            const onPlatform = isColliding(player.collider, this.bridgePlatform);
            const falling = !onPlatform && player.position.y < this.gapUpperBound && player.position.y > this.gapLowerBound && !player.isDodging;

            if (!falling) {
                player.tick(dt, inputState);

                for (const p of playerProjectiles.buffer) {
                    p.tick(dt);
                }
            }
        }

        // Borders
        {
            let upperBound = this.camera.size.y * 2 + this.camera.size.y / 2 - 10;
            let lowerBound = - this.camera.size.y - this.camera.size.y / 2 + 10;
            if (screenIdx === 2) {
                lowerBound = this.camera.size.y * 2 - this.camera.size.y / 2 + 10;
            }
            if (screenIdx === -1) {
                upperBound = - this.camera.size.y / 2 - 10;
            }
            if (player.position.y > upperBound) {
                player.position.y = upperBound;
            } else if (player.position.y < lowerBound) {
                player.position.y = lowerBound;
            }
        }
        {
            const upperBound = this.camera.size.x / 2 - 10;
            const lowerBound = -this.camera.size.x / 2 + 10;
            if (player.position.x > upperBound) {
                player.position.x = upperBound;
            } else if (player.position.x < lowerBound) {
                player.position.x = lowerBound;
            }
        }

        // Move camera to screen index
        this.targetCameraPosition.y = screenIdx * this.camera.size.y;
        Vec2.lerp(this.camera.position, this.targetCameraPosition, 5 * dt, this.camera.position);
    }

    // Called every render frame (frame dependent, varied delta time)
    public draw(dt: number) {
        this.camera.start();

        // Clear screen
        const ctx = this.renderer.ctx;
        const w = this.renderer.canvas.width;
        const hx = w / 2;
        const h = this.renderer.canvas.width;
        const hy = h / 2;
        ctx.clearRect(-hx, -hy, w, h);

        // Map
        {
            const img = sprites.lobby;
            const scaleFactor = this.camera.size.y / img.height;
            ctx.save();
            ctx.translate(0, 0);
            ctx.rotate(Math.PI);
            ctx.scale(scaleFactor, scaleFactor);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }

        {
            const img = sprites.bridge;
            const scaleFactor = this.camera.size.y / img.height;
            ctx.save();
            ctx.translate(0, this.camera.size.y);
            ctx.rotate(Math.PI);
            ctx.scale(scaleFactor, scaleFactor);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }

        {
            const img = sprites.farm;
            const scaleFactor = this.camera.size.y / img.height;
            ctx.save();
            ctx.translate(0, -this.camera.size.y);
            ctx.rotate(Math.PI);
            ctx.scale(scaleFactor, scaleFactor);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }

        {
            const img = sprites.castle;
            const scaleFactor = this.camera.size.y / img.height;
            ctx.save();
            ctx.translate(0, this.camera.size.y * 2);
            ctx.rotate(Math.PI);
            ctx.scale(scaleFactor, scaleFactor);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }

        const {
            player,
            playerProjectiles
        } = this.state;

        player.draw(ctx);

        if (this.drawColliders) {
            // Bridge gap
            {
                ctx.beginPath();
                ctx.moveTo(-this.camera.size.x / 2, this.gapUpperBound);
                ctx.lineTo(this.camera.size.x / 2, this.gapUpperBound);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-this.camera.size.x / 2, this.gapLowerBound);
                ctx.lineTo(this.camera.size.x / 2, this.gapLowerBound);
                ctx.strokeStyle = "rgb(0, 255, 0)";
                ctx.stroke();

                this.bridgePlatform.draw(ctx);
            }

            // Render player
            player.collider.draw(ctx, "rgb(0, 0, 255)");
            for (const p of playerProjectiles.buffer) {
                p.collider.draw(ctx);
            }
        }

        this.camera.end();
    }
}