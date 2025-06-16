
export class HuiVector {
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

    copy(): HuiVector {
        return new HuiVector(this.x, this.y);
    }

    add(other: HuiVector): HuiVector {
        return new HuiVector(this.x + other.x, this.y + other.y);
    }

    move(dx: number, dy: number): HuiVector {
      return new HuiVector(this.x + dx, this.y + dy);
    }

    sub(other: HuiVector): HuiVector {
        return new HuiVector(this.x - other.x, this.y - other.y);
    }

    to(other: HuiVector): HuiVector {
        return new HuiVector(other.x - this.x, other.y - this.y);
    }

    dot(other: HuiVector): number {
        return this.x * other.x + this.y * other.y;
    }

    times(other: HuiVector) {
        return new HuiVector(this.x * other.x, this.y * other.y);
    }

    abs(factor = 1) {
        return new HuiVector(Math.abs(this.x) * factor, Math.abs(this.y) * factor);
    }

    scale(factor: number) {
        return new HuiVector(this.x * factor, this.y * factor);
    }

    scaleFrom(from: HuiVector, factor: number) {
        return from.add(from.to(this).scale(factor));
    }

    div(divisor: number | HuiVector) {
        if (typeof divisor === "number") {
            if (divisor === 0) return new HuiVector(0, 0);
            return new HuiVector(this.x / divisor, this.y / divisor);
        }
        else return new HuiVector(divisor.x ? (this.x / divisor.x) : 0, divisor.y ? (this.y / divisor.y) : 0);
    }

    len() {
        return Math.sqrt(this.dot(this));
    }

    norm(factor = 1) {
        return this.div(this.len()).scale(factor);
    }

    dirTo(other: HuiVector) {
      return this.to(other).norm();
    }

    distTo(other: HuiVector) {
        return this.to(other).len();
    }

    rotate(theta: number) {
        let s = Math.sin(theta);
        let c = Math.cos(theta);
        let rp = new HuiVector(this.x * c - this.y * s, this.x * s + this.y * c);
        return rp;
    }

    rotateAround(mid: HuiVector, theta: number) {
        return mid.add(mid.to(this).rotate(theta));
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    angleTo(other: HuiVector) {
        return this.to(other).angle();
    }

    angleBetween(other: HuiVector) {
        return other.angle() - this.angle();
    }

    min(other: HuiVector) {
        return new HuiVector(
            Math.min(this.x, other.x),
            Math.min(this.y, other.y)
        )
    }

    max(other: HuiVector) {
        return new HuiVector(
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
        return new HuiVector(Math.sign(this.x) * factor, Math.sign(this.y) * factor);
    }

    /**
     * Safe projection onto a vector.
     * Projects onto [1, 1] if onto is [0, 0].
     * @param onto 
     * @returns projected vector
     */
    proj(onto: HuiVector): HuiVector {
        const safeOnto = onto.isZero() ? HuiVector.ONES() : onto;
        return safeOnto.scale(this.dot(safeOnto) / safeOnto.dot(safeOnto));
    }

    /**
     * Safe SIGN-PRESERVING projection onto a vector.
     * Projects onto [1, 1] if onto is [0, 0].
     * @param onto 
     * @returns signed projected vector
     */
    signedProj(onto: HuiVector): HuiVector {
        return this.proj(onto.times(this.sign()));
    }

    isZero() {
        return this.x === 0 && this.y === 0;
    }

    static ZEROS() {
        return new HuiVector(0, 0);
    }

    static ONES() {
        return new HuiVector(1, 1);
    }
    
    static sum(...vectors: HuiVector[]) {
        let sum = new HuiVector(0, 0);
        for (const v of vectors) {
            sum = sum.add(v);
        }
        return sum;
    }

    static avg(...vectors: HuiVector[]) {
        return HuiVector.sum(...vectors).div(vectors.length);
    }

    static min(...vectors: HuiVector[]) {
        let min = vectors.length > 0 ? vectors[0] : new HuiVector(0, 0);
        for (const v of vectors) {
            min = min.min(v);
        }
        return min;
    }

    static max(...vectors: HuiVector[]) {
        let max = vectors.length > 0 ? vectors[0] : new HuiVector(0, 0);
        for (const v of vectors) {
            max = max.max(v);
        }
        return max;
    }
}

export class BoundingBox {
    topLeft: HuiVector;
    bottomRight: HuiVector;

    constructor(v1: HuiVector, v2: HuiVector) {
        this.topLeft = v1.min(v2);
        this.bottomRight = v1.max(v2);
    }

    isInside(pos: HuiVector) {
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
export function vec2(x?: number, y?: number): HuiVector {
    if (x === undefined) return HuiVector.ZEROS();
    if (y === undefined) return new HuiVector(x, x);
    return new HuiVector(x, y)
};

export function bbox(v1: HuiVector, v2: HuiVector): BoundingBox {
    return new BoundingBox(v1, v2);
}
export function bbox2(x1: number, y1: number, x2: number, y2: number): BoundingBox {
    return bbox(vec2(x1, y1), vec2(x2, y2));
}