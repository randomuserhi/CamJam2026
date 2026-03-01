const cache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(path: string): Promise<HTMLImageElement> {
    if (cache.has(path)) return cache.get(path)!;

    const req = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.src = path;
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", (e) => reject(e));
    });
    cache.set(path, req);
    return req;
}

export class Anim {
    frames: HTMLImageElement[];
    duration: number;
    private rate: number;

    constructor(frames: HTMLImageElement[], duration: number) {
        this.frames = frames;
        this.duration = duration;
        this.rate = this.duration / this.frames.length;
    }

    public get(time: number) {
        time = time % this.duration;

        let min = 0;
        let max = this.frames.length;
        let prev = -1;
        while (max != min) {
            const midpoint = Math.floor((max + min) / 2);
            if (midpoint == prev) break;
            prev = midpoint;
            if (midpoint * this.rate > time)
                max = midpoint;
            else
                min = midpoint;
        }

        return this.frames[min];
    }
}

export interface DuckAnims {
    bottomLeftIdle: Anim;
    topLeftIdle: Anim;
    bottomLeftWalk: Anim;
    topLeftWalk: Anim;
}

export const sprites = {
    top: await loadImage("/leaderboard/app/assets/scoreboardtop.png"),
    middle1: await loadImage("/leaderboard/app/assets/scoreboardtile1.png"),
    middle2: await loadImage("/leaderboard/app/assets/scoreboardtile2.png")
} as const;