import { html } from "rhu/html.asl";
import { Style } from "rhu/style.asl";
import { Game } from "./game.asl";
import { Renderer } from "./renderer.asl";
import { ControllerInput } from "./input/controller.asl";

const style = Style(({ css }) => {
    const wrapper = css.style`
    display: block;
    width: 100%;
    height: 100%;

    image-rendering: pixelated;
    `;

    return {
        wrapper,
    };
});

interface GameComp {
    canvas: HTMLCanvasElement;

    game: Game | undefined;
    renderer: Renderer;

    init(): void;
    resize(): void;
    createGame(): void;
}

export const comp = () => {
    return html`<div m-id=""></div>`;
}

export const GameComp = html.wc(() => {
    const proto: object = GameComp.prototype;
    const comp = html(proto) <GameComp>`
    <canvas m-id="canvas" class="${style.wrapper}"></canvas>
    `;
    html(comp).box();

    comp.init();
    comp.createGame();

    return comp;
});
GameComp.prototype = {
    createGame() {
        this.renderer = new Renderer(this.canvas);

        const controller = new ControllerInput();

        // const replay: Replay = JSON.parse(`{ "seed": 0, "frames": [{"state":{"movement":{"x":0,"y":0},"attack":false,"dodge":false},"idx":1},{"state":{"movement":{"x":0,"y":-1},"attack":false,"dodge":false},"idx":70},{"state":{"movement":{"x":0.7071067811865475,"y":-0.7071067811865475},"attack":false,"dodge":false},"idx":80},{"state":{"movement":{"x":0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":89},{"state":{"movement":{"x":1,"y":0},"attack":true,"dodge":false},"idx":93},{"state":{"movement":{"x":0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":99},{"state":{"movement":{"x":0,"y":1},"attack":true,"dodge":false},"idx":104},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":110},{"state":{"movement":{"x":-1,"y":0},"attack":true,"dodge":false},"idx":115},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":117},{"state":{"movement":{"x":0,"y":-1},"attack":true,"dodge":false},"idx":123},{"state":{"movement":{"x":0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":127},{"state":{"movement":{"x":1,"y":0},"attack":true,"dodge":false},"idx":133},{"state":{"movement":{"x":0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":136},{"state":{"movement":{"x":0,"y":1},"attack":true,"dodge":false},"idx":140},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":146},{"state":{"movement":{"x":-1,"y":0},"attack":true,"dodge":false},"idx":149},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":150},{"state":{"movement":{"x":0,"y":-1},"attack":true,"dodge":false},"idx":157},{"state":{"movement":{"x":0,"y":0},"attack":true,"dodge":false},"idx":162},{"state":{"movement":{"x":0,"y":0},"attack":false,"dodge":false},"idx":166},{"state":{"movement":{"x":1,"y":0},"attack":false,"dodge":false},"idx":246},{"state":{"movement":{"x":1,"y":0},"attack":true,"dodge":false},"idx":251},{"state":{"movement":{"x":0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":263},{"state":{"movement":{"x":0,"y":1},"attack":true,"dodge":false},"idx":272},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":276},{"state":{"movement":{"x":-1,"y":0},"attack":true,"dodge":false},"idx":280},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":281},{"state":{"movement":{"x":0,"y":-1},"attack":true,"dodge":false},"idx":286},{"state":{"movement":{"x":0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":291},{"state":{"movement":{"x":0,"y":-1},"attack":true,"dodge":false},"idx":302},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":305},{"state":{"movement":{"x":-1,"y":0},"attack":true,"dodge":false},"idx":317},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":353},{"state":{"movement":{"x":0,"y":-1},"attack":true,"dodge":false},"idx":358},{"state":{"movement":{"x":0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":366},{"state":{"movement":{"x":1,"y":0},"attack":true,"dodge":false},"idx":384},{"state":{"movement":{"x":0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":385},{"state":{"movement":{"x":0,"y":1},"attack":true,"dodge":false},"idx":390},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":393},{"state":{"movement":{"x":-1,"y":0},"attack":true,"dodge":false},"idx":399},{"state":{"movement":{"x":-1,"y":0},"attack":false,"dodge":false},"idx":400},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":false,"dodge":false},"idx":404},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":416},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":false,"dodge":false},"idx":419},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":424},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":false,"dodge":false},"idx":427},{"state":{"movement":{"x":-1,"y":0},"attack":true,"dodge":false},"idx":433},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":false,"dodge":false},"idx":435},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":440},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":false,"dodge":false},"idx":444},{"state":{"movement":{"x":0,"y":-1},"attack":false,"dodge":false},"idx":449},{"state":{"movement":{"x":0,"y":-1},"attack":true,"dodge":false},"idx":450},{"state":{"movement":{"x":0,"y":-1},"attack":false,"dodge":false},"idx":452},{"state":{"movement":{"x":0.7071067811865475,"y":-0.7071067811865475},"attack":false,"dodge":false},"idx":454},{"state":{"movement":{"x":0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":457},{"state":{"movement":{"x":1,"y":0},"attack":true,"dodge":false},"idx":459},{"state":{"movement":{"x":1,"y":0},"attack":false,"dodge":false},"idx":460},{"state":{"movement":{"x":1,"y":0},"attack":true,"dodge":false},"idx":465},{"state":{"movement":{"x":0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":467},{"state":{"movement":{"x":0.7071067811865475,"y":0.7071067811865475},"attack":false,"dodge":false},"idx":468},{"state":{"movement":{"x":0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":473},{"state":{"movement":{"x":0,"y":1},"attack":true,"dodge":false},"idx":475},{"state":{"movement":{"x":0,"y":1},"attack":false,"dodge":false},"idx":476},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":false,"dodge":false},"idx":479},{"state":{"movement":{"x":-0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":481},{"state":{"movement":{"x":-1,"y":0},"attack":true,"dodge":false},"idx":483},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":485},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":false,"dodge":false},"idx":486},{"state":{"movement":{"x":-0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":491},{"state":{"movement":{"x":0,"y":-1},"attack":true,"dodge":false},"idx":492},{"state":{"movement":{"x":0.7071067811865475,"y":-0.7071067811865475},"attack":true,"dodge":false},"idx":494},{"state":{"movement":{"x":1,"y":0},"attack":true,"dodge":false},"idx":500},{"state":{"movement":{"x":0.7071067811865475,"y":0.7071067811865475},"attack":true,"dodge":false},"idx":501},{"state":{"movement":{"x":0,"y":1},"attack":true,"dodge":false},"idx":543},{"state":{"movement":{"x":0,"y":1},"attack":true,"dodge":true},"idx":565},{"state":{"movement":{"x":0,"y":1},"attack":true,"dodge":false},"idx":574}] }`);
        // const controller = new ReplayController(replay.frames);

        this.game = new Game("Adam", this.renderer, controller, Date.now());
    },

    init() {
        let timeLeft = 0;
        let tickEnd = 0;
        const loop = () => {
            const tickStart = Date.now();
            if (tickStart > tickEnd + timeLeft && this.game) {

                // Fixed ticks
                this.game.tick(this.game.fixedDeltaTime);
                this.game.draw(this.game.fixedDeltaTime);

                tickEnd = Date.now();
                const elapsed = (tickEnd - tickStart) / 1000;
                timeLeft = this.game.totalFrameTimeMs - elapsed;
                if (timeLeft < 0) {
                    console.warn(`Tick took ${tickEnd - tickStart} ms which was longer than expected, ${this.game.totalFrameTimeMs} ms.`);
                    timeLeft = 0;
                }
            }
            if (!__ASL.signal.aborted) requestAnimationFrame(loop);
        };
        loop();

        window.addEventListener("resize", () => {
            this.resize();
        }, { signal: __ASL.signal });

        this.canvas.addEventListener("mount", () => {
            this.resize();
        }, { signal: __ASL.signal });
    },

    resize() {
        if (!this.canvas.parentElement) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
};