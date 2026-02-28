import { xor } from "./rand.asl";
import { Renderer } from "./renderer.asl";

export class Game {
    public readonly tickRate = 60;
    public readonly totalFrameTimeS = 1.0 / this.tickRate;
    public readonly totalFrameTimeMs = Math.round(this.totalFrameTimeS * 1000);
    public readonly fixedDeltaTime = this.totalFrameTimeS;

    public readonly renderer: Renderer;

    public readonly rand: () => number;

    public tickIdx = 0;

    constructor(renderer: Renderer, rngSeed: number) {
        this.renderer = renderer;
        this.rand = xor(rngSeed);
    }

    // Called every game tick (frame independent, fixed delta time)
    public tick(dt: number) {
        ++this.tickIdx;
    }

    // Called every render frame (frame dependent, varied delta time)
    public update(dt: number) {
        const ctx = this.renderer.ctx;
        ctx.clearRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
    }
}