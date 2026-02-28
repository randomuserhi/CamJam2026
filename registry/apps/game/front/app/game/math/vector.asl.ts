export type Vec2 = { x: number, y: number };

export namespace Vec2 {
    export function zero(result?: Vec2) {
        if (!result) result = { x: 0, y: 0 };

        result.x = 0;
        result.y = 0;

        return result;
    }

    export function up(result?: Vec2) {
        if (!result) result = { x: 0, y: 0 };

        result.x = 0;
        result.y = 1;

        return result;
    }

    export function down(result?: Vec2) {
        if (!result) result = { x: 0, y: 0 };

        result.x = 0;
        result.y = -1;

        return result;
    }

    export function left(result?: Vec2) {
        if (!result) result = { x: 0, y: 0 };

        result.x = -1;
        result.y = 0;

        return result;
    }

    export function right(result?: Vec2) {
        if (!result) result = { x: 0, y: 0 };

        result.x = 1;
        result.y = 0;

        return result;
    }

    export function ones(result?: Vec2) {
        if (!result) result = { x: 0, y: 0 };

        result.x = 1;
        result.y = 1;

        return result;
    }

    export function sqrdMagnitude(v: Vec2) {
        return v.x * v.x + v.y * v.y;
    }

    export function magnitude(v: Vec2) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    export function copy(v: Vec2, result?: Vec2): Vec2 {
        if (!result) result = { x: 0, y: 0 };

        result.x = v.x;
        result.y = v.y;

        return result;
    }

    export function normalize(v: Vec2, result?: Vec2): Vec2 {
        if (!result) result = { x: 0, y: 0 };

        const length = magnitude(v);
        result.x = v.x / length;
        result.y = v.y / length;

        return result;
    }

    export function add(a: Vec2, b: Vec2, result?: Vec2): Vec2 {
        if (!result) result = { x: 0, y: 0 };

        result.x = a.x + b.x;
        result.y = a.y + b.y;

        return result;
    }

    export function sub(a: Vec2, b: Vec2, result?: Vec2): Vec2 {
        if (!result) result = { x: 0, y: 0 };

        result.x = a.x - b.x;
        result.y = a.y - b.y;

        return result;
    }

    export function dot(a: Vec2, b: Vec2): number {
        return a.x * b.x + a.y * b.y;
    }

    export function perp(v: Vec2, result?: Vec2): Vec2 {
        if (!result) result = { x: 0, y: 0 };

        const { x, y } = v;

        result.x = y;
        result.y = -x;

        return result;
    }

    export function rotate(v: Vec2, radians: number, result?: Vec2): Vec2 {
        if (!result) result = { x: 0, y: 0 };

        const c = Math.cos(radians);
        const s = Math.sin(radians);

        const { x, y } = v;

        result.x = x * c - y * s;
        result.y = x * s + y * c;

        return result;
    }

    export function set(x: number, y: number, result?: Vec2) {
        if (!result) result = { x: 0, y: 0 };

        result.x = x;
        result.y = y;

        return result;
    }

    export function scale(v: Vec2, a: number, result?: Vec2) {
        if (!result) result = { x: 0, y: 0 };

        result.x = v.x * a;
        result.y = v.y * a;

        return result;
    }
}