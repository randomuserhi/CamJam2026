import { CSRID } from "../crsid.asl";

export interface Stats {
    damageDealt: number;
    statuesDestroyed: CSRID[];
}

export function createStat(): Stats {
    return {
        damageDealt: 0,
        statuesDestroyed: []
    }
}
