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
    menu: {
        title: await loadImage("/ancientgeese/assets/title.png"),
    },
    statue: {
        bottomLeftWalk: new Anim([
            await loadImage("/ancientgeese/assets/duck/Statue Front/Statue Break Front1.png"),
            await loadImage("/ancientgeese/assets/duck/Statue Front/Statue Break Front2.png"),
            await loadImage("/ancientgeese/assets/duck/Statue Front/Statue Break Front3.png"),
            await loadImage("/ancientgeese/assets/duck/Statue Front/Statue Break Front4.png"),
            await loadImage("/ancientgeese/assets/duck/Statue Front/Statue Break Front5.png"),
        ], 1),
        topLeftWalk: new Anim([
            await loadImage("/ancientgeese/assets/duck/Statue Back/Duck Statue Break Back1.png"),
            await loadImage("/ancientgeese/assets/duck/Statue Back/Duck Statue Break Back2.png"),
            await loadImage("/ancientgeese/assets/duck/Statue Back/Duck Statue Break Back3.png"),
            await loadImage("/ancientgeese/assets/duck/Statue Back/Duck Statue Break Back4.png"),
            await loadImage("/ancientgeese/assets/duck/Statue Back/Duck Statue Break Back5.png"),
        ], 1),
        bottomLeftIdle: new Anim([
            await loadImage("/ancientgeese/assets/duck/Duck Front Petrify/Duck Front Petrify1.png"),
            await loadImage("/ancientgeese/assets/duck/Duck Front Petrify/Duck Front Petrify2.png"),
            await loadImage("/ancientgeese/assets/duck/Duck Front Petrify/Duck Front Petrify3.png"),
            await loadImage("/ancientgeese/assets/duck/Duck Front Petrify/Duck Front Petrify4.png"),
            await loadImage("/ancientgeese/assets/duck/Duck Front Petrify/Duck Front Petrify5.png"),
        ], 2),
        topLeftIdle: new Anim([
            await loadImage("/ancientgeese/assets/duck/Duck Back Petrify/Duck Back Petrify1.png"),
            await loadImage("/ancientgeese/assets/duck/Duck Back Petrify/Duck Back Petrify2.png"),
            await loadImage("/ancientgeese/assets/duck/Duck Back Petrify/Duck Back Petrify3.png"),
            await loadImage("/ancientgeese/assets/duck/Duck Back Petrify/Duck Back Petrify4.png"),
            await loadImage("/ancientgeese/assets/duck/Duck Back Petrify/Duck Back Petrify5.png"),
        ], 2)
    },
    duck: {
        bottomLeftWalk: new Anim([
            await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Base1.png"),
            await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Base2.png"),
            await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Base3.png"),
            await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Base4.png"),
            await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Base5.png"),
        ], 1),
        topLeftWalk: new Anim([
            await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Base1.png"),
            await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Base2.png"),
            await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Base3.png"),
            await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Base4.png"),
            await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Base5.png"),
        ], 1),
        bottomLeftIdle: new Anim([
            await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Base1.png"),
            await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Base2.png"),
        ], 1),
        topLeftIdle: new Anim([
            await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Base1.png"),
            await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Base2.png"),
        ], 1)
    },
    hat: {
        bandana: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Bandana.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Bandana.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Bandana1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Bandana2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Bandana1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Bandana2.png"),
            ], 1)
        },
        flower: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Flower.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Flower.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Flower1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Flower2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Flower1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Flower2.png"),
            ], 1)
        },
        hunter: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Hunter.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Hunter.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Hunter1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Hunter2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Hunter1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Hunter2.png"),
            ], 1)
        },
        leather: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Leather.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Leather.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Leather1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Leather2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Leather1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Leather2.png"),
            ], 1)
        },
        spartan: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Spartan.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Spartan.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Spartan1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Spartan2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Spartan1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Spartan2.png"),
            ], 1)
        },
        wizard: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk WizardHat.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back WizardHat.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front WizardHat1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front WizardHat2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back WizardHat1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back WizardHat2.png"),
            ], 1)
        },
    },
    body: {
        herbalist: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Herbalist.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Herbalist.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Herbalist1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Herbalist2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Herbalist1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Herbalist2.png"),
            ], 1)
        },
        jacket: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Jacket.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Jacket.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Jacket1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Jacket2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Jacket1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Jacket2.png"),
            ], 1)
        },
        mage: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Mage1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Mage2.png"),
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Mage3.png"),
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Mage4.png"),
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Mage5.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Mage1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Mage2.png"),
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Mage3.png"),
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Mage4.png"),
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Mage5.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Mage1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Mage2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Mage1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Mage2.png"),
            ], 1)
        },
        warrior: {
            bottomLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Walk Animation/Duck Front Walk Warrior.png"),
            ], 1),
            topLeftWalk: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Walk Animation/Duck Back Warrior.png"),
            ], 1),
            bottomLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Warrior1.png"),
                await loadImage("/ancientgeese/assets/duck/Front Idle/Duck Front Warrior2.png"),
            ], 1),
            topLeftIdle: new Anim([
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Warrior1.png"),
                await loadImage("/ancientgeese/assets/duck/Back Idle/Duck Back Warrior2.png"),
            ], 1)
        },
    },
    backgrounds: {
        lobby: await loadImage("/ancientgeese/assets/backgrounds/lobby.png"),
        bridge: await loadImage("/ancientgeese/assets/backgrounds/bridge.png"),
        arena: await loadImage("/ancientgeese/assets/backgrounds/arena.png"),
    },
    ui: {
        heart: await loadImage("/ancientgeese/assets/ui/heart.png"),
        emptyheart: await loadImage("/ancientgeese/assets/ui/emptyheart.png"),
        bossbar: await loadImage("/ancientgeese/assets/ui/bosshealthbar.png"),
        shoottip: await loadImage("/ancientgeese/assets/ui/shoottip.png"),
        jumptip: await loadImage("/ancientgeese/assets/ui/jumptip.png"),
    },
    projectiles: {
        leaf: await loadImage("/ancientgeese/assets/proj/leaf.png"),
        fireball: await loadImage("/ancientgeese/assets/proj/fireball.png"),
        dagger: await loadImage("/ancientgeese/assets/proj/dagger.png"),
        money: await loadImage("/ancientgeese/assets/proj/20.png")
    },
    boss: {
        death: new Anim([
            await loadImage("/ancientgeese/assets/boss/death/Megoosa Death1.png"),
            await loadImage("/ancientgeese/assets/boss/death/Megoosa Death2.png"),
            await loadImage("/ancientgeese/assets/boss/death/Megoosa Death3.png"),
            await loadImage("/ancientgeese/assets/boss/death/Megoosa Death4.png"),
            await loadImage("/ancientgeese/assets/boss/death/Megoosa Death5.png"),
            await loadImage("/ancientgeese/assets/boss/death/Megoosa Death6.png"),
        ], 5),
        walk: new Anim([
            await loadImage("/ancientgeese/assets/boss/walk/Megoosa Walk1.png"),
            await loadImage("/ancientgeese/assets/boss/walk/Megoosa Walk2.png"),
            await loadImage("/ancientgeese/assets/boss/walk/Megoosa Walk3.png"),
            await loadImage("/ancientgeese/assets/boss/walk/Megoosa Walk4.png"),
        ], 1),
        scream: new Anim([
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.1.png"),
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.2.png"),
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.3.png"),
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.4.png"),
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.5.png"),
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.6.png"),
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.7.png"),
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.8.png"),
            await loadImage("/ancientgeese/assets/boss/scream/Megoosa Scream.9.png"),
        ], 3),
        chargeWindUp: new Anim([
            await loadImage("/ancientgeese/assets/boss/charge/Megoosa Charge1.png"),
            await loadImage("/ancientgeese/assets/boss/charge/Megoosa Charge2.png"),
            await loadImage("/ancientgeese/assets/boss/charge/Megoosa Charge3.png"),
            await loadImage("/ancientgeese/assets/boss/charge/Megoosa Charge4.png"),
            await loadImage("/ancientgeese/assets/boss/charge/Megoosa Charge5.png"),
            await loadImage("/ancientgeese/assets/boss/charge/Megoosa Charge6.png"),
        ], 2),
        charge: await loadImage("/ancientgeese/assets/boss/charge/Megoosa Charge7.png"),
        projectiles: {
            orb: await loadImage("/ancientgeese/assets/boss/projectiles/orb.png"),
        }
    },
    effects: {
        explosion: new Anim([
            await loadImage("/ancientgeese/assets/fx/explosion/explosion1.png"),
            await loadImage("/ancientgeese/assets/fx/explosion/explosion2.png"),
            await loadImage("/ancientgeese/assets/fx/explosion/explosion3.png"),
            await loadImage("/ancientgeese/assets/fx/explosion/explosion4.png"),
            await loadImage("/ancientgeese/assets/fx/explosion/explosion5.png"),
            await loadImage("/ancientgeese/assets/fx/explosion/explosion6.png"),
        ], 0.5),
        leaf: new Anim([
            await loadImage("/ancientgeese/assets/fx/leaf/leaf1.png"),
            await loadImage("/ancientgeese/assets/fx/leaf/leaf2.png"),
            await loadImage("/ancientgeese/assets/fx/leaf/leaf3.png"),
            await loadImage("/ancientgeese/assets/fx/leaf/leaf4.png"),
            await loadImage("/ancientgeese/assets/fx/leaf/leaf5.png"),
            await loadImage("/ancientgeese/assets/fx/leaf/leaf6.png"),
        ], 0.5),
        slash: new Anim([
            await loadImage("/ancientgeese/assets/fx/slash/slash1.png"),
            await loadImage("/ancientgeese/assets/fx/slash/slash2.png"),
            await loadImage("/ancientgeese/assets/fx/slash/slash3.png"),
            await loadImage("/ancientgeese/assets/fx/slash/slash4.png"),
            await loadImage("/ancientgeese/assets/fx/slash/slash5.png"),
        ], 0.5),
    }
} as const;

export type DuckBody = keyof typeof sprites["body"] | "none";
export type DuckHat = keyof typeof sprites["hat"] | "none";

export const DuckBody: DuckBody[] = [
    "herbalist",
    "jacket",
    "mage",
    "warrior",
    "none"
];

export const DuckHat: DuckHat[] = [
    "bandana",
    "flower",
    "hunter",
    "leather",
    "spartan",
    "wizard",
    "none"
];