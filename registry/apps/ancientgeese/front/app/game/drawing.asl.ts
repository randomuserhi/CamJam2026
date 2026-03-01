import { DuckAnims, sprites } from "./sprites.asl";

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.rotate(Math.PI);
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

export function drawImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, sx: number = 1, sy: number = 1, rotation: number = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-sx, sy);
    ctx.rotate(Math.PI + rotation);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
}

export function drawDuck(ctx: CanvasRenderingContext2D, set: DuckAnims, time: number, idx: number, x: number, y: number, scale: number = 1, idle: boolean = true) {
    let duck: HTMLImageElement;
    let sx = 1;
    let sy = 1;
    switch (idx) {
        default:
            if (idle) duck = set.bottomLeftIdle.get(time);
            else duck = set.bottomLeftWalk.get(time);
            break;
        case 1:
            if (idle) duck = set.topLeftIdle.get(time);
            else duck = set.topLeftWalk.get(time);
            break;
        case 2:
            if (idle) duck = set.topLeftIdle.get(time);
            else duck = set.topLeftWalk.get(time);
            sx = -1;
            break;
        case 3:
            if (idle) duck = set.bottomLeftIdle.get(time);
            else duck = set.bottomLeftWalk.get(time);
            sx = -1;
            break;
    }
    drawImage(ctx, duck, x, y, scale * sx, scale * sy);
}

export function drawStatue(ctx: CanvasRenderingContext2D, time: number, idx: number, x: number, y: number, scale: number = 1) {
    let duck: HTMLImageElement;
    let sx = 1;
    let sy = 1;
    switch (idx) {
        default:
            duck = sprites.statue.bottomLeftWalk.get(time);
            break;
        case 1:
            duck = sprites.statue.topLeftWalk.get(time);
            break;
        case 2:
            duck = sprites.statue.topLeftWalk.get(time);
            sx = -1;
            break;
        case 3:
            duck = sprites.statue.bottomLeftWalk.get(time);
            sx = -1;
            break;
    }
    drawImage(ctx, duck, x, y, scale * sx, scale * sy);
}