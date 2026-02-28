import { Vec2 } from "./math/vector.asl";

export class Camera {
    readonly renderer: Renderer
    readonly position: Vec2 = Vec2.set(0, 0);
    readonly size: Vec2 = Vec2.set(320, 180);

    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }
    
    public start() {
        const ctx = this.renderer.ctx;
        const canvas = this.renderer.canvas;
        
        const aspectRatio = this.size.x / this.size.y;
        let scaleFactor;
        if (canvas.width / canvas.height > aspectRatio) {
            scaleFactor = canvas.height / this.size.y;
        } else {
            scaleFactor = canvas.width / this.size.x;
        }
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scaleFactor, -scaleFactor)
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