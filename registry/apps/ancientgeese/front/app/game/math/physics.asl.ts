import { Vec2 } from "./vector.asl";

class BoxCollider_Vec2 implements Vec2 {
    private readonly collider: BoxCollider;
    private readonly reconstructVerts;

    private _x = 0;
    private _y = 0;

    constructor(collider: BoxCollider, reconstructVerts: boolean = false) {
        this.collider = collider;
        this.reconstructVerts = reconstructVerts;
    }

    public get x() {
        return this._x;
    }
    public get y() {
        return this._y;
    }
    public set x(value: number) {
        this._x = value;
        (this.collider as any)._dirty = true;
        if (this.reconstructVerts) (this.collider as any)._needToReconstructVerts = true;
    }
    public set y(value: number) {
        this._y = value;
        (this.collider as any)._dirty = true;
        if (this.reconstructVerts) (this.collider as any)._needToReconstructVerts = true;
    }
}

interface _BoxCollider {
    _rotation: number;
    _position: BoxCollider_Vec2;
    _size: BoxCollider_Vec2;
    _dirty: boolean;
    _needToReconstructVerts: boolean;

    hx: number;
    hy: number;
    axis: [right: Vec2, up: Vec2];
}

export class BoxCollider {
    private _rotation: number = 0;
    private _position: BoxCollider_Vec2 = new BoxCollider_Vec2(this);
    private _size: BoxCollider_Vec2 = new BoxCollider_Vec2(this, true);
    private _dirty: boolean = false;
    private _needToReconstructVerts: boolean = false;

    private hx: number = this._size.x * 0.5;
    private hy: number = this._size.y * 0.5;
    private axis: [right: Vec2, up: Vec2] = [Vec2.right(), Vec2.up()];
    private rotatedVerts: [bl: Vec2, br: Vec2, tr: Vec2, tl: Vec2] = [
        { x: -this.hx, y: -this.hy },
        { x: this.hx, y: -this.hy },
        { x: this.hx, y: this.hy },
        { x: -this.hx, y: this.hy }
    ];
    public localVerts: [bl: Vec2, br: Vec2, tr: Vec2, tl: Vec2] = [
        { x: -this.hx, y: -this.hy },
        { x: this.hx, y: -this.hy },
        { x: this.hx, y: this.hy },
        { x: -this.hx, y: this.hy }
    ];
    public verts: [bl: Vec2, br: Vec2, tr: Vec2, tl: Vec2] = [
        { x: -this.hx, y: -this.hy },
        { x: this.hx, y: -this.hy },
        { x: this.hx, y: this.hy },
        { x: -this.hx, y: this.hy }
    ];

    public update(force?: boolean) {
        this._dirty = this._dirty || this._needToReconstructVerts;
        if (!force && !this._dirty) return;

        if (this._needToReconstructVerts) {
            this.hx = this._size.x * 0.5;
            this.hy = this._size.y * 0.5;

            Vec2.set(-this.hx, -this.hy, this.localVerts[0]);
            Vec2.set(this.hx, -this.hy, this.localVerts[1]);
            Vec2.set(this.hx, this.hy, this.localVerts[2]);
            Vec2.set(-this.hx, this.hy, this.localVerts[3]);

            for (let i = 0; i < 4; ++i) {
                const localVert = this.localVerts[i];
                const rotatedVert = this.rotatedVerts[i];
                Vec2.rotate(localVert, this._rotation, rotatedVert);
            }

            this._needToReconstructVerts = false;
        }

        for (let i = 0; i < 4; ++i) {
            const rotatedVert = this.rotatedVerts[i];
            const vert = this.verts[i];
            Vec2.add(rotatedVert, this._position, vert);
        }

        Vec2.rotate(Vec2.right(this.axis[0]), this._rotation, this.axis[0]);
        Vec2.rotate(Vec2.up(this.axis[1]), this._rotation, this.axis[1]);

        this._dirty = false;
    }

    public draw(ctx: CanvasRenderingContext2D, color?: string) {
        this.update();
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this._rotation);
        ctx.strokeStyle = color ?? "rgb(0, 255, 0)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.hx, -this.hy, this._size.x, this._size.y);
        ctx.restore();
    }

    public get rotation() {
        return this._rotation;
    }
    public set rotation(value: number) {
        this._rotation = value;
        this._dirty = true;
        this._needToReconstructVerts = true;
    }

    public get position() {
        return this._position;
    }
    public set position(value: Vec2) {
        Vec2.copy(value, this._position);
    }

    public get size() {
        return this._size;
    }
    public set size(value: Vec2) {
        Vec2.copy(value, this._size);
        this._dirty = true;
        this._needToReconstructVerts = true;
    }
}

export class CircleCollider {
    position: Vec2 = Vec2.zero();
    radius: number = 1;

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgb(0, 255, 0)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

export interface ContactInfo {
    normal: Vec2;
    point: Vec2;
    penetrationDistance: number;
}

export type Collider = BoxCollider | CircleCollider;

export function isColliding(a: Collider, b: Collider): ContactInfo | undefined {
    if (a instanceof BoxCollider) {
        if (b instanceof BoxCollider) {
            return isCollidingBoxBox(a, b);
        } else {
            return isCollidingBoxCircle(a, b);
        }
    } else {
        if (b instanceof BoxCollider) {
            const result = isCollidingBoxCircle(b, a);
            if (result) {
                Vec2.scale(result.normal, -1, result.normal);
            }
            return result;
        } else {
            return isCollidingCircleCircle(a, b);
        }
    }
}

function projectPoints(axis: Vec2, points: Vec2[]): [min: number, max: number] {
    let min = Infinity;
    let max = -Infinity;

    for (const p of points) {
        const d = Vec2.dot(p, axis);
        min = Math.min(min, d);
        max = Math.max(max, d);
    }
    return [min, max];
}

function overlap(minA: number, maxA: number, minB: number, maxB: number): number {
    return Math.min(maxA, maxB) - Math.max(minA, minB);
}

function centerDirection(a: Vec2, b: Vec2, result?: Vec2): Vec2 {
    return Vec2.sub(b, a, result);
}

const __isCollidingBoxBox = { dir: Vec2.zero() } as const;
function isCollidingBoxBox(a: BoxCollider, b: BoxCollider): ContactInfo | undefined {
    const { dir } = __isCollidingBoxBox;

    a.update();
    b.update();

    const _a: _BoxCollider = a as any;
    const _b: _BoxCollider = b as any;

    let minOverlap = Infinity;
    let smallestAxis: Vec2 = undefined!;

    for (const axis of _a.axis) {
        const [minA, maxA] = projectPoints(axis, a.verts);
        const [minB, maxB] = projectPoints(axis, b.verts);

        const o = overlap(minA, maxA, minB, maxB);
        if (o <= 0) {
            return undefined;
        }

        if (o < minOverlap) {
            minOverlap = o;
            smallestAxis = axis;
        }
    }
    for (const axis of _b.axis) {
        const [minA, maxA] = projectPoints(axis, a.verts);
        const [minB, maxB] = projectPoints(axis, b.verts);

        const o = overlap(minA, maxA, minB, maxB);
        if (o <= 0) {
            return undefined;
        }

        if (o < minOverlap) {
            minOverlap = o;
            smallestAxis = axis;
        }
    }

    centerDirection(a.position, b.position, dir);

    const normal = Vec2.copy(smallestAxis);
    if (Vec2.dot(dir, normal) >= 0) {
        Vec2.scale(normal, -1, normal);
    }

    const point = Vec2.scale(normal, minOverlap * 0.5);
    Vec2.add(a.position, point, point);

    return {
        normal,
        point,
        penetrationDistance: minOverlap
    };
}

const __isCollidingBoxCircle = { dir: Vec2.zero(), axis: Vec2.zero(), temp: Vec2.zero() } as const;
function isCollidingBoxCircle(a: BoxCollider, b: CircleCollider): ContactInfo | undefined {
    const { dir, axis } = __isCollidingBoxCircle;

    a.update();

    const _a: _BoxCollider = a as any;

    let minOverlap = Infinity;
    let smallestAxis: Vec2 = undefined!;

    for (const axis of _a.axis) {
        const [minA, maxA] = projectPoints(axis, a.verts);

        const centerProj = Vec2.dot(b.position, axis);
        const minB = centerProj - b.radius;
        const maxB = centerProj + b.radius;

        const o = overlap(minA, maxA, minB, maxB);
        if (o <= 0) return undefined;

        if (o < minOverlap) {
            minOverlap = o;
            smallestAxis = axis;
        }
    }

    let closest = a.verts[0];
    let minDistSq = Vec2.sqrdMagnitude(Vec2.sub(closest, b.position, dir));

    for (const v of a.verts) {
        const d = Vec2.sqrdMagnitude(Vec2.sub(v, b.position, dir));
        if (d < minDistSq) {
            minDistSq = d;
            closest = v;
        }
    }

    Vec2.normalize(Vec2.sub(b.position, closest, axis), axis);
    if (Vec2.sqrdMagnitude(axis) > Math.epsilon) {
        const [minA, maxA] = projectPoints(axis, a.verts);
        const centerProj = Vec2.dot(b.position, axis);
        const minB = centerProj - b.radius;
        const maxB = centerProj + b.radius;

        const o = overlap(minA, maxA, minB, maxB);
        if (o <= 0) return undefined;

        if (o < minOverlap) {
            minOverlap = o;
            smallestAxis = axis;
        }
    }

    const normal = Vec2.copy(smallestAxis);
    Vec2.sub(b.position, a.position, dir);
    if (Vec2.dot(dir, normal) >= 0) {
        Vec2.scale(normal, -1, normal);
    }

    const point = Vec2.scale(normal, b.radius);
    Vec2.sub(b.position, point, point);

    return {
        normal,
        point,
        penetrationDistance: minOverlap
    };
}

const __isCollidingCircleCircle = { dir: Vec2.zero() } as const;
function isCollidingCircleCircle(a: CircleCollider, b: CircleCollider): ContactInfo | undefined {
    const { dir } = __isCollidingCircleCircle;
    Vec2.sub(a.position, b.position, dir);
    const sqrdMag = Vec2.sqrdMagnitude(dir);
    const r = b.radius + a.radius;

    if (sqrdMag > r * r) return undefined;

    const dist = Math.sqrt(sqrdMag);

    const normal = dist > Math.epsilon
        ? Vec2.scale(dir, 1 / dist)
        : Vec2.up();

    const penetration = r - dist;

    const point = Vec2.scale(normal, b.radius);
    Vec2.add(b.position, point, point);

    return {
        normal,
        point,
        penetrationDistance: penetration
    };
}

export interface RayHitInfo {
    collider: Collider;
    normal: Vec2;
    point: Vec2;
    distance: number;
}

export class Ray {
    origin: Vec2;
    direction: Vec2;

    constructor(origin: Vec2, direction: Vec2) {
        this.origin = origin;
        this.direction = Vec2.normalize(direction, direction);
    }

    at(t: number, result?: Vec2): Vec2 {
        return Vec2.add(this.origin, Vec2.scale(this.direction, t, result), result);
    }
}

export function raycast(ray: Ray, colliders: Collider[]): RayHitInfo | undefined {
    let hit: RayHitInfo | undefined = undefined;
    for (const collider of colliders) {
        let _hit: RayHitInfo | undefined = undefined;
        if (collider instanceof BoxCollider) {
            _hit = rayBox(ray, collider);
        } else {
            _hit = rayCircle(ray, collider);
        }
        if (_hit && (!hit || _hit.distance < hit.distance)) {
            hit = _hit;
        }
    }
    return hit;
}

const __rayCircle = { dir: Vec2.zero() } as const;
function rayCircle(ray: Ray, collider: CircleCollider): RayHitInfo | undefined {
    const { dir } = __rayCircle;

    const m = Vec2.sub(ray.origin, collider.position, dir);

    const b = Vec2.dot(m, ray.direction);
    const c = Vec2.sqrdMagnitude(m) - collider.radius * collider.radius;

    if (c > 0 && b > 0) {
        return undefined;
    }

    const discr = b * b - c;
    if (discr < 0) {
        return undefined;
    }

    const t = -b - Math.sqrt(discr);
    if (t < 0) {
        // If ray started inside collider we dont count hit
        return undefined;
    }

    const point = ray.at(t);
    const normal = Vec2.sub(point, collider.position);
    Vec2.normalize(normal, normal);

    return {
        collider,
        point,
        normal,
        distance: t
    };
}

const __rayBox = {
    localOrigin: Vec2.zero(),
    localDir: Vec2.zero(),
    right: Vec2.right(),
    up: Vec2.up(),
    faceNormal: Vec2.zero(),
    localNormal: Vec2.zero()
} as const;
function rayBox(ray: Ray, collider: BoxCollider): RayHitInfo | undefined {
    const { localOrigin, localDir, right, up, faceNormal, localNormal } = __rayBox;

    // Transform ray into box local space
    const invRot = -collider.rotation;
    Vec2.rotate(Vec2.sub(ray.origin, collider.position, localOrigin), invRot, localOrigin);
    Vec2.rotate(ray.direction, invRot, localDir);

    const _collider: _BoxCollider = collider as any;
    const { hx, hy } = _collider;

    let tmin = -Infinity;
    let tmax = Infinity;
    Vec2.zero(localNormal);

    const axes = [
        { min: -hx, max: hx, origin: localOrigin.x, dir: localDir.x, axis: right },
        { min: -hy, max: hy, origin: localOrigin.y, dir: localDir.y, axis: up }
    ];

    for (const a of axes) {
        if (Math.abs(a.dir) < Math.epsilon) {
            if (a.origin < a.min || a.origin > a.max)
                return undefined;
        } else {
            let t1 = (a.min - a.origin) / a.dir;
            let t2 = (a.max - a.origin) / a.dir;

            Vec2.copy(a.axis, faceNormal);

            if (t1 > t2) {
                [t1, t2] = [t2, t1];
                Vec2.scale(faceNormal, -1, faceNormal);
            }

            if (t1 > tmin) {
                tmin = t1;
                Vec2.copy(faceNormal, localNormal);
            }

            tmax = Math.min(tmax, t2);

            if (tmin > tmax)
                return undefined;
        }
    }

    if (tmin < 0) return undefined;
    const t = tmin;

    const point = Vec2.scale(localDir, t);
    Vec2.add(localOrigin, point, point);
    Vec2.rotate(point, collider.rotation, point);
    Vec2.add(point, collider.position, point);
    const normal = Vec2.rotate(localNormal, collider.rotation);
    Vec2.normalize(normal, normal);

    return {
        collider,
        point,
        normal,
        distance: t
    };
}