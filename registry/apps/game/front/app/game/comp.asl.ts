import { html } from "rhu/html.asl";
import { Style } from "rhu/style.asl";
import { Game } from "./game.asl";
import { Renderer } from "./renderer.asl";

const style = Style(({ css }) => {
    const wrapper = css.style`
    display: block;
    width: 100%;
    height: 100%;
    `;

    return {
        wrapper,
    };
});

interface GameComp {
    canvas: HTMLCanvasElement;

    game: Game;
    renderer: Renderer;

    init(): void;
    resize(): void;
}

export const GameComp = html.wc(() => {
    const proto: object = GameComp.prototype;
    const comp = html(proto)<GameComp>`
    <canvas m-id="canvas" class="${style.wrapper}"></canvas>
    `;
    html(comp).box();

    comp.init();

    return comp;
});
GameComp.prototype = {
    init() {
        this.renderer = new Renderer(this.canvas);
        this.game = new Game(this.renderer, Date.now());

        let timeLeft = 0;
        let tickEnd = 0;
        let prevTime: number | undefined = undefined;
        const loop = (ftime?: number) => {
            if (ftime) {
                if (!prevTime) {
                    prevTime = ftime;
                    tickEnd = prevTime;
                } else {
                    const dt = ftime - prevTime;
                    prevTime = ftime;
                
                    const tickStart = Date.now();
                    if (tickStart > tickEnd + timeLeft) {
                        
                        // Fixed ticks
                        this.game.tick(this.game.fixedDeltaTime);

                        tickEnd = Date.now();
                        const elapsed = (tickEnd - tickStart) / 1000;
                        timeLeft = this.game.totalFrameTimeMs - elapsed;
                        if (timeLeft < 0) {
                            console.warn(`Tick took ${tickEnd - tickStart} ms which was longer than expected, ${this.game.totalFrameTimeMs} ms.`);
                            timeLeft = 0;
                        }
                    }

                    // Varied frames
                    this.game.update(dt);
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