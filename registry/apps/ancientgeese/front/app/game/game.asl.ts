import { Renderer } from "./renderer.asl";
import { Gameplay } from "./states/gameplay.asl";
import { Menu } from "./states/menu.asl";

export class Game {
    public readonly tickRate = 60;
    public readonly totalFrameTimeS = 1.0 / this.tickRate;
    public readonly totalFrameTimeMs = Math.round(this.totalFrameTimeS * 1000);
    public readonly fixedDeltaTime = this.totalFrameTimeS;

    public readonly renderer: Renderer;

    public inReplayMode = false;
    public async replayMode(id?: number) {
        if (id === undefined) {
            this.inReplayMode = true;
            const resp = await fetch(`/ancientgeese/api/replay`, { method: "GET" });
            this.menu.exit(await resp.json());
        } else {
            const resp = await fetch(`/ancientgeese/api/replay?id=${id}`, { method: "GET" });
            this.menu.exit(await resp.json());
        }
    }

    public mode: "Gameplay" | "Menu" = "Menu";
    public menu: Menu;
    public gameplay: Gameplay;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        this.menu = new Menu(this, this.renderer);
        this.gameplay = new Gameplay(this, this.renderer);
    }

    public tick(dt: number) {
        switch (this.mode) {
            case "Gameplay":
                this.gameplay.tick(dt);
                break;
            case "Menu":
                this.menu.tick(dt);
                break;
        }
    }

    public draw(time: number, dt: number) {
        switch (this.mode) {
            case "Gameplay":
                this.gameplay.draw(time, dt);
                break;
            case "Menu":
                this.menu.draw(time, dt);
                break;
        }
    }
}