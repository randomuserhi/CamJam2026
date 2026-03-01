import { Vec2 } from "./math/vector.asl";

export class Camera {
    readonly renderer: Renderer
    readonly position: Vec2 = Vec2.set(0, 0);
    readonly size: Vec2 = Vec2.set(640, 360);
    scaleFactor: number = 1;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    public start() {
        const ctx = this.renderer.ctx;
        ctx.imageSmoothingEnabled = false;
        const canvas = this.renderer.canvas;

        const aspectRatio = this.size.x / this.size.y;
        if (canvas.width / canvas.height > aspectRatio) {
            this.scaleFactor = canvas.height / this.size.y;
        } else {
            this.scaleFactor = canvas.width / this.size.x;
        }

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(this.scaleFactor, -this.scaleFactor)
        ctx.translate(-this.position.x, -this.position.y);
    }

    public end() {
        const ctx = this.renderer.ctx;
        ctx.restore();
    }
}

export class Renderer {
    public readonly canvas: HTMLCanvasElement;
    public readonly ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d")!;

        this.ctx.imageSmoothingEnabled = false;
    }
}