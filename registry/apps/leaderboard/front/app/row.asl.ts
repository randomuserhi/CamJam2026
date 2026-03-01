import { html } from "rhu/html.asl";
import { Style } from "rhu/style.asl";
import { sprites } from "./sprites.asl";

const style = Style(({ css }) => {
    const wrapper = css.style`
    display: block;
    width: 100%;
    height: 100%;

    position: absolute;
    top: 0;
    left: 0;

    image-rendering: pixelated;
    `;

    return {
        wrapper,
    };
});

interface Row {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    
    picky: HTMLDivElement;

    size: { x: number, y: number };
    scaleFactor: number;

    sprite: HTMLImageElement;

    resize(): void; 

    names: HTMLSpanElement[];
    dmg: HTMLSpanElement[];
}

export const Row = html.wc((sprite: HTMLImageElement, offset: number = 100) => {
    const proto: object = Row.prototype;
    const comp = html(proto) <Row>`
    <div m-id="picky" style="font-size: 50px; font-family: INET; position: relative; width: 100%; height: 500px; display: flex; flex-direction: column; align-items: center;">
        <canvas m-id="canvas" class="${style.wrapper}" style="z-index: -1;"></canvas>
        <ul style="display: flex; flex-direction: column; z-index: 1000; color: black; min-width: 350px; gap: 35px; margin-top: ${offset.toString()}px;">
            <li style="display: flex; align-items: left; gap: 10px;">
                <span m-id="names" style="flex: 4">NAME</span>
                <span m-id="dmg" style="flex: 1">DAMAGE</span>
            </li>
            <li style="display: flex; align-items: left; gap: 10px;">
                <span m-id="names" style="flex: 4">NAME</span>
                <span m-id="dmg" style="flex: 1">DAMAGE</span>
            </li>
            <li style="display: flex; align-items: left; gap: 10px;">
                <span m-id="names" style="flex: 4">NAME</span>
                <span m-id="dmg" style="flex: 1">DAMAGE</span>
            </li>
            <li style="display: flex; align-items: left; gap: 10px;">
                <span m-id="names" style="flex: 4">NAME</span>
                <span m-id="dmg" style="flex: 1">DAMAGE</span>
            </li>
            <li style="display: flex; align-items: left; gap: 10px;">
                <span m-id="names" style="flex: 4">NAME</span>
                <span m-id="dmg" style="flex: 1">DAMAGE</span>
            </li>
            <li style="display: flex; align-items: left; gap: 10px;">
                <span m-id="names" style="flex: 4">NAME</span>
                <span m-id="dmg" style="flex: 1">DAMAGE</span>
            </li>
        </ul>
    </div>
    `;
    html(comp).box();

    window.addEventListener("resize", () => {
        comp.resize();
    }, { signal: __ASL.signal });

    comp.canvas.addEventListener("mount", () => {
        comp.resize();
    }, { signal: __ASL.signal });

    comp.ctx = comp.canvas.getContext("2d")!;

    comp.size = {
        x: 640, y: 360
    };

    comp.scaleFactor = 1;

    comp.sprite = sprite;

    return comp;
});
Row.prototype = {
    resize() {
        if (!this.canvas.parentElement) return;
        const rect = this.canvas.parentElement!.parentElement!.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = 500;

        this.ctx.imageSmoothingEnabled = false;

        const aspectRatio = this.size.x / this.size.y;
        if (this.canvas.width / this.canvas.height > aspectRatio) {
            this.scaleFactor = this.canvas.height / this.size.y;
        } else {
            this.scaleFactor = this.canvas.width / this.size.x;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.scaleFactor, -this.scaleFactor)
        this.ctx.scale(5, 5);
        this.ctx.rotate(Math.PI);
        this.ctx.drawImage(this.sprite, -sprites.top.width / 2, -sprites.top.height / 2);
        this.ctx.restore();
    }
};