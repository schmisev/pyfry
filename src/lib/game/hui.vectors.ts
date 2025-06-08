
export class Vector2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    get xy(): [number, number] {
        return [this.x, this.y];
    }

    get xyHalf(): [number, number] {
        return [this.x / 2, this.y / 2];
    }

    copy(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    sub(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    to(other: Vector2): Vector2 {
        return new Vector2(other.x - this.x, other.y - this.y);
    }

    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }

    times(other: Vector2) {
        return new Vector2(this.x * other.x, this.y * other.y);
    }

    abs(factor = 1) {
        return new Vector2(Math.abs(this.x) * factor, Math.abs(this.y) * factor);
    }

    scale(factor: number) {
        return new Vector2(this.x * factor, this.y * factor);
    }

    scaleFrom(from: Vector2, factor: number) {
        return from.add(from.to(this).scale(factor));
    }

    div(divisor: number | Vector2) {
        if (typeof divisor === "number") {
            if (divisor === 0) return new Vector2(0, 0);
            return new Vector2(this.x / divisor, this.y / divisor);
        }
        else return new Vector2(divisor.x ? (this.x / divisor.x) : 0, divisor.y ? (this.y / divisor.y) : 0);
    }

    len() {
        return Math.sqrt(this.dot(this));
    }

    norm(factor = 1) {
        return this.div(this.len()).scale(factor);
    }

    distTo(other: Vector2) {
        return this.to(other).len();
    }

    rotate(theta: number) {
        let s = Math.sin(theta);
        let c = Math.cos(theta);
        let rp = new Vector2(this.x * c - this.y * s, this.x * s + this.y * c);
        return rp;
    }

    rotateAround(mid: Vector2, theta: number) {
        return mid.add(mid.to(this).rotate(theta));
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    angleTo(other: Vector2) {
        return this.to(other).angle();
    }

    angleBetween(other: Vector2) {
        return other.angle() - this.angle();
    }

    min(other: Vector2) {
        return new Vector2(
            Math.min(this.x, other.x),
            Math.min(this.y, other.y)
        )
    }

    max(other: Vector2) {
        return new Vector2(
            Math.max(this.x, other.x),
            Math.max(this.y, other.y)
        )
    }

    /**
     * Makes x- & y-axis equal to the signed MINIMUM of the axes.
     * This is useful for scaling isotropically.
     */
    signedIsoMin() {
        const signed = this.sign();
        const abs = this.abs();
        const val = Math.min(abs.x, abs.y);
        return signed.scale(val);
    }

    /**
     * Makes x- & y-axis equal to the signed MAXIMUM of the axes.
     * This is useful for scaling isotropically.
     */
    signedIsoMax() {
        const signed = this.sign();
        const abs = this.abs();
        const val = Math.max(abs.x, abs.y);
        return signed.scale(val);
    }

    sign(factor = 1) {
        return new Vector2(Math.sign(this.x) * factor, Math.sign(this.y) * factor);
    }

    /**
     * Safe projection onto a vector.
     * Projects onto [1, 1] if onto is [0, 0].
     * @param onto 
     * @returns projected vector
     */
    proj(onto: Vector2): Vector2 {
        const safeOnto = onto.isZero() ? Vector2.ONES() : onto;
        return safeOnto.scale(this.dot(safeOnto) / safeOnto.dot(safeOnto));
    }

    /**
     * Safe SIGN-PRESERVING projection onto a vector.
     * Projects onto [1, 1] if onto is [0, 0].
     * @param onto 
     * @returns signed projected vector
     */
    signedProj(onto: Vector2): Vector2 {
        return this.proj(onto.times(this.sign()));
    }

    isZero() {
        return this.x === 0 && this.y === 0;
    }

    static ZEROS() {
        return new Vector2(0, 0);
    }

    static ONES() {
        return new Vector2(1, 1);
    }
    
    static sum(...vectors: Vector2[]) {
        let sum = new Vector2(0, 0);
        for (const v of vectors) {
            sum = sum.add(v);
        }
        return sum;
    }

    static avg(...vectors: Vector2[]) {
        return Vector2.sum(...vectors).div(vectors.length);
    }

    static min(...vectors: Vector2[]) {
        let min = vectors.length > 0 ? vectors[0] : new Vector2(0, 0);
        for (const v of vectors) {
            min = min.min(v);
        }
        return min;
    }

    static max(...vectors: Vector2[]) {
        let max = vectors.length > 0 ? vectors[0] : new Vector2(0, 0);
        for (const v of vectors) {
            max = max.max(v);
        }
        return max;
    }
}

export class BoundingBox {
    topLeft: Vector2;
    bottomRight: Vector2;

    constructor(v1: Vector2, v2: Vector2) {
        this.topLeft = v1.min(v2);
        this.bottomRight = v1.max(v2);
    }

    isInside(pos: Vector2) {
        return pos.x >= this.topLeft.x && pos.y >= this.topLeft.y && pos.x <= this.bottomRight.x && pos.y <= this.bottomRight.y;
    }

    get left() { return this.topLeft.x; }
    get right() { return this.bottomRight.x; }
    get top() { return this.topLeft.y; }
    get bottom() { return this.bottomRight.y; }
}

// utilities
/**
 * Utility to quickly create a Vector2
 * @param x, if not given, returns Vector.ZEROS()
 * @param y, if not given, returns new Vectors2(x, x)
 * @returns generally new Vector(x, y)
 */
export function vec2(x?: number, y?: number): Vector2 {
    if (x === undefined) return Vector2.ZEROS();
    if (y === undefined) return new Vector2(x, x);
    return new Vector2(x, y)
};

export function bbox(v1: Vector2, v2: Vector2): BoundingBox {
    return new BoundingBox(v1, v2);
}
export function bbox2(x1: number, y1: number, x2: number, y2: number): BoundingBox {
    return bbox(vec2(x1, y1), vec2(x2, y2));
}