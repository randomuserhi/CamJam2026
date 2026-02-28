import { xor } from "./rand.asl";
import { Camera, Renderer } from "./renderer.asl";

export class Game {
    public readonly tickRate = 60;
    public readonly totalFrameTimeS = 1.0 / this.tickRate;
    public readonly totalFrameTimeMs = Math.round(this.totalFrameTimeS * 1000);
    public readonly fixedDeltaTime = this.totalFrameTimeS;

    public readonly renderer: Renderer;
    private readonly camera: Camera;

    public readonly rand: () => number;

    public tickIdx = 0;

    constructor(renderer: Renderer, rngSeed: number) {
        this.renderer = renderer;
        this.camera = new Camera(renderer);
        this.rand = xor(rngSeed);
    }

    // Called every game tick (frame independent, fixed delta time)
    public tick(dt: number) {
        ++this.tickIdx;
    }

    // Called every render frame (frame dependent, varied delta time)
    public update(dt: number) {
        this.camera.start();

        const ctx = this.renderer.ctx;
        ctx.clearRect(0, 0, this.camera.size.x, this.camera.size.y);

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.fillRect(-80, -45, 160, 90);

        this.camera.end();
    }
}