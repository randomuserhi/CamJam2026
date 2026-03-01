import { DuckBody, DuckHat } from "./sprites.asl";

export interface CSRID {
    hat: DuckHat;
    body: DuckBody;
    name: string;
    college: string;
    classname: "Herbalist" | "Warrior" | "Wizard" | "Jacket";
}