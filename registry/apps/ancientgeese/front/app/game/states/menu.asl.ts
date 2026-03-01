import { drawDuck, drawImage } from "../drawing.asl";
import { Game } from "../game.asl";
import { Bezier } from "../math/bezier.asl";
import { Camera, Renderer } from "../renderer.asl";
import { DuckBody, DuckHat, sprites } from "../sprites.asl";
import { GameState } from "./savestate.asl";

export const ws = new WebSocket(`ws://${window.location.host}/ancientgeese`);

export class Menu {
    private camera: Camera;
    private renderer: Renderer;

    private hat: DuckHat = "none";
    private body: DuckBody = "none";

    private state: "Enter" | "Idle" | "Exit" = "Enter";

    private game: Game;

    constructor(game: Game, renderer: Renderer) {
        this.game = game;
        this.renderer = renderer;
        this.camera = new Camera(this.renderer);

        this.enter();

        ws.addEventListener("message", e => {
            this.exit(JSON.parse(e.data));
        }, { signal: __ASL.signal })
    }

    public enter() {
        this.game.mode = "Menu";
        this.timer = 0;
        this.state = "Enter";
        this.hat = DuckHat[Math.floor(Math.random() * DuckHat.length)];
        this.body = DuckBody[Math.floor(Math.random() * DuckBody.length)];

        if (this.game.inReplayMode) {
            this.game.replayMode();
        }
    }

    public gameState?: GameState = undefined;

    public exit(gameState: GameState) {
        console.log(gameState);
        this.game.mode = "Menu";
        this.gameState = gameState;
        this.timer = 0;
        this.state = "Exit";
    }

    public tick(dt: number) {

    }

    private timer = 0;

    private y: number = 0;

    private enterDuration = 3;
    private duckEnterCurve = Bezier(0.09, 0.14, 0.59, 0.95);

    private exitDuration = 3;
    private duckExitCurve = Bezier(0.19, -0.01, 0.74, -0.05);

    public draw(time: number, dt: number) {
        this.camera.start();

        // Clear screen
        const ctx = this.renderer.ctx;
        const w = this.renderer.canvas.width / this.camera.scaleFactor;
        const hx = w / 2;
        const h = this.renderer.canvas.height / this.camera.scaleFactor;
        const hy = h / 2;
        ctx.clearRect(this.camera.position.x - hx, this.camera.position.y - hy, w, h);

        ctx.fillStyle = "black";
        ctx.fillRect(this.camera.position.x - hx, this.camera.position.y - hy, w, h);

        this.timer += dt;

        const titleScale = 1.25;

        if (this.state === "Enter") {
            const t = Math.clamp01(this.timer / this.enterDuration);

            ctx.globalAlpha = t;
            drawImage(ctx, sprites.menu.title, 0, 50, titleScale, titleScale);
            ctx.globalAlpha = 1;

            /*ctx.font = "40px INET";
            ctx.fillStyle = `rgba(255, 255, 255, ${t})`;
            drawText(ctx, "Ancient Geese", 0, 0);*/

            // Animated duck
            let idx = Math.floor((time * 2) % 4);
            const y = (1 - this.duckEnterCurve(t)) * 300 - 70 - 15;
            drawDuck(ctx, sprites.duck, time, idx, 0, y, 2);
            if (this.body !== "none") drawDuck(ctx, sprites.body[this.body], time, idx, 0, y, 2);
            if (this.hat !== "none") drawDuck(ctx, sprites.hat[this.hat], time, idx, 0, y, 2);

            if (this.timer > this.enterDuration) {
                this.state = "Idle";
                this.timer = 0;
            }
        } else if (this.state === "Idle") {
            drawImage(ctx, sprites.menu.title, 0, 50, titleScale, titleScale);

            // Animated duck
            let idx = Math.floor((time * 2) % 4);
            this.y = -70 - Math.sin(this.timer + Math.PI / 2) * 15;
            drawDuck(ctx, sprites.duck, time, idx, 0, this.y, 2);
            if (this.body !== "none") drawDuck(ctx, sprites.body[this.body], time, idx, 0, this.y, 2);
            if (this.hat !== "none") drawDuck(ctx, sprites.hat[this.hat], time, idx, 0, this.y, 2);
        } else if (this.state === "Exit") {
            const t = Math.clamp01(this.timer / this.exitDuration);

            ctx.globalAlpha = Math.clamp01(1 - t * 5);
            drawImage(ctx, sprites.menu.title, 0, 50, titleScale, titleScale);
            ctx.globalAlpha = 1;

            let y: number;
            if (t < 0.3) {
                const _t = t / 0.3;
                y = this.duckEnterCurve(_t) * 70 + this.y;
            } else {
                const _t = (t - 0.3) / 0.7;
                y = 70 + this.y - this.duckExitCurve(_t) * 300;
            }

            // Draw duck
            let idx = Math.floor((time * 2) % 4);
            drawDuck(ctx, sprites.duck, time, idx, 0, y, 2);
            if (this.body !== "none") drawDuck(ctx, sprites.body[this.body], time, idx, 0, y, 2);
            if (this.hat !== "none") drawDuck(ctx, sprites.hat[this.hat], time, idx, 0, y, 2);

            if (this.timer > this.exitDuration) {
                this.state = "Idle";
                this.timer = 0;

                if (this.gameState === undefined) throw new Error("Cannot enter without a csrid!");
                this.game.gameplay.gameplayEnter.enter(this.gameState);
            }
        }

        this.camera.end();
    }
}