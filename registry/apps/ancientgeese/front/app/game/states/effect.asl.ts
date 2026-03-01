import { DoubleBuffer } from "../doubleBuffer.asl";
import { drawImage } from "../drawing.asl";
import { Vec2 } from "../math/vector.asl";
import { Camera } from "../renderer.asl";
import { Anim } from "../sprites.asl";

export class ParticleEffect {
    static effects: DoubleBuffer<ParticleEffect> = new DoubleBuffer();

    anim: Anim;

    constructor(anim: Anim) {
        ParticleEffect.effects.buffer.push(this);
        this.anim = anim;
        this.timer = this.anim.duration;
    }

    timer = 0;
    scale = 1;
    position = Vec2.zero();
    public draw(ctx: CanvasRenderingContext2D, dt: number) {
        drawImage(ctx, this.anim.get(Math.clamp(this.timer, 0, this.anim.duration - 0.1)), this.position.x, this.position.y, this.scale, this.scale);
    }
}

export function tickAllEffects(camera: Camera, ctx: CanvasRenderingContext2D, dt: number) {
    camera.start();
    for (const e of ParticleEffect.effects.buffer) {
        e.draw(ctx, dt);
        e.timer += dt;
        if (e.timer < e.anim.duration) ParticleEffect.effects.push(e);
    }
    ParticleEffect.effects.swap();
    camera.end();
}