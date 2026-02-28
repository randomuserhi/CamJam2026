import { InputProvider } from "./input/inputProvider.asl";
import { Vec2 } from "./math/vector.asl";
import { Player } from "./player.asl";
import { xor } from "./rand.asl";
import { Camera, Renderer } from "./renderer.asl";

export class Game {
    public readonly tickRate = 60;
    public readonly totalFrameTimeS = 1.0 / this.tickRate;
    public readonly totalFrameTimeMs = Math.round(this.totalFrameTimeS * 1000);
    public readonly fixedDeltaTime = this.totalFrameTimeS;

    public readonly renderer: Renderer;
    private readonly camera: Camera;
    private readonly inputProvider: InputProvider;

    public readonly rand: () => number;

    public tickIdx = 0;

    private player: Player;

    constructor(renderer: Renderer, inputProvider: InputProvider, rngSeed: number) {
        this.renderer = renderer;
        this.camera = new Camera(renderer);
        this.inputProvider = inputProvider;
        this.rand = xor(rngSeed);

        // Init game state
        this.player = new Player();
    }

    // Called every game tick (frame independent, fixed delta time)
    public tick(dt: number) {
        this.playerTick(dt);

        ++this.tickIdx;
    }

    private playerTick(dt: number) {
        const inputState = this.inputProvider.getInput(this.tickIdx);

        const player = this.player;

        // Movement
        Vec2.add(player.velocity, Vec2.scale(inputState.movement, player.speed), player.velocity);

        // Friction
        Vec2.scale(player.velocity, 0.8, player.velocity);

        // Integrate position
        player.integrate(dt);
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

        // Render player
        this.player.collider.draw(ctx);

        this.camera.end();
    }
}