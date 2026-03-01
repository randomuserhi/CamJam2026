export interface Stats {
    damageDealt: number;
    statuesDestroyed: number;
}

export function createStat(): Stats {
    return {
        damageDealt: 0,
        statuesDestroyed: 0
    }
}