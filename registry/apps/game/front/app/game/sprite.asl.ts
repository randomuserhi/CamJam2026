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

export const sprites = {
    duck: await loadImage("/game/assets/duck.png"),
    lobby: await loadImage("/game/assets/lobby.png"),
    bridge: await loadImage("/game/assets/bridge.png"),
    farm: await loadImage("/game/assets/farm.png"),
    castle: await loadImage("/game/assets/castle.png"),
};