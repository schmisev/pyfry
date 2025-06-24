import type { PyProxy } from "pyodide/ffi";
import { HuiThing } from "./hui.thing";
import { HuiVector, vec2 } from "./hui.vector";
import type { HuiBox, HuiDisc } from "./hui.mover";

function component_to_hex(c: number) {
  const hex = Math.floor(c).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

export function hex(r: number, g: number, b: number) {
  return "#" + component_to_hex(r) + component_to_hex(g) + component_to_hex(b);
}

export function rnd() {
  return Math.random();
}
export function rndr(min: number, max: number) {
  return min + Math.random() * (max - min);
}
export function rndi(min: number, max: number) {
  return Math.floor(rndr(min, max));
}

export function rnd_dir() {
  return vec2(1, 0).rotate(rnd() * Math.PI * 2);
}

export function lerp(a: number, b: number, t: number): number;
export function lerp(a: HuiVector, b: HuiVector, t: number): HuiVector;
export function lerp(a: number | HuiVector, b: number | HuiVector, t: number) {
  if (typeof a === "number" && typeof b === "number")
    return a + (b - a) * t;
  else if (a instanceof HuiVector && b instanceof HuiVector)
    return a.add(b.sub(a).scale(t));
  else
    throw TypeError("lerp(a, b, t) can only be used on two numbers or two vectors!")
}

export function querp(a: number, b: number, t: number): number;
export function querp(a: HuiVector, b: HuiVector, t: number): HuiVector;
export function querp(a: number | HuiVector, b: number | HuiVector, t: number) {
  if (typeof a === "number" && typeof b === "number")
    return lerp(a, b, t*t);
  else if (a instanceof HuiVector && b instanceof HuiVector)
    return lerp(a, b, t*t);
  else
    throw TypeError("querp(a, b, t) can only be used on two numbers or two vectors!")
}

export function wrap(value: number, min: number, max: number) {
  return (value > max) ? min + (value - max) : (value < min) ? max - (min - value) : value;
}

export function clamp(value: number, min: number, max: number) {
  return (value < min) ? min : (value > max) ? max : value;
}

export function sign(value: number | HuiVector) {
  if (typeof value === "number")
    return (value < 0) ? -1 : (value > 0) ? 1 : 0;
  else
    return value.sign();
}

export function move_towards(a: number | HuiVector, b: number | HuiVector, delta: number) {
  if (typeof a === "number" && typeof b === "number") {
    let step = Math.min(Math.abs(b - a), delta);
    let dir = Math.sign(b - a);
    return a + dir * step;
  } else if (a instanceof HuiVector && b instanceof HuiVector) {
    let step = Math.min(a.to(b).len(), delta);
    let dir = a.to(b).norm();
    return a.add(dir.scale(step));
    return 
  }
  else
    throw TypeError("move_towards(a, b, delta) can only be used on two numbers or two vectors!")
}

export function quad_in_out(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

// more utils
export function reavg(old_v: number, new_v: number, count: number) {
  if (count <= 0) count = 1;
  return (old_v * (count-1) + new_v) / count;
}

export function is_py_proxy(obj: Object): obj is PyProxy {
  return obj.constructor.name === "PyProxy"
}

export function call_method_if_it_exists<T extends unknown>(method_name: keyof T, args: any[], thing: T) {
  thing && typeof thing === "object" && method_name in thing && typeof thing[method_name] === "function" && thing[method_name](...args);
}

export function has_method<T extends unknown>(thing: T, method_name: keyof T): boolean {
  return !!thing && typeof thing === "object" && method_name in thing && typeof thing[method_name] === "function"
}

function get_axes_of_rect(rect: HuiVector[]): HuiVector[] {
    const axes: HuiVector[] = [];
    for (let i = 0; i < 4; i++) {
        const p1 = rect[i];
        const p2 = rect[(i + 1) % 4];
        axes.push(p1.to(p2).perp().norm());
    }
    return axes.slice(0, 2); // Only 2 unique axes for rectangle
}

function project_rect(rect: HuiVector[], axis: HuiVector): { min: number, max: number } {
    const dots = rect.map(p => p.dot(axis));
    return {
        min: Math.min(...dots),
        max: Math.max(...dots)
    };
}

function overlap_on_axis(a: { min: number, max: number }, b: { min: number, max: number }): number {
    return Math.min(a.max, b.max) - Math.max(a.min, b.min);
}

export function disc_disc_collision(a: HuiDisc, b: HuiDisc): boolean {
  return a.pos.dist_to(b.pos) < (a.r + b.r);
}

export function disc_box_collision(a: HuiDisc, b: HuiBox): boolean {
  const lp = b.local_pos(a.pos);
  const ext_w = (b.w/2 + a.r);
  const ext_h = (b.h/2 + a.r);
  const closest = vec2(clamp(lp.x, -ext_w, ext_w), clamp(lp.y, -ext_h, ext_h));

  return closest.dist_to(lp) < a.r;
}

export function box_box_collision(a: HuiBox, b: HuiBox): boolean {
  return SAT_collision(a, b).collided;
}

export function SAT_collision(a: HuiBox, b: HuiBox): { collided: false } | { collided: true, mtv: HuiVector } {
    const rect_a = [...a.collision_points()];
    const rect_b = [...b.collision_points()];

    const axes_a = get_axes_of_rect(rect_a);
    const axes_b = get_axes_of_rect(rect_b);
    const axes = [...axes_a, ...axes_b]

    let min_overlap = Infinity;
    let smallest_axis: HuiVector | null = null;


    for (const axis of axes) {
        const proj_a = project_rect(rect_a, axis);
        const proj_b = project_rect(rect_b, axis);
        const overlap = overlap_on_axis(proj_a, proj_b);

        if (overlap <= 0) return { collided: false };

        if (overlap < min_overlap) {
          min_overlap = overlap;
          smallest_axis = axis;
        }
    }

    if (smallest_axis) {
        // Determine the direction of MTV: from A to B
        const direction = a.pos.to(b.pos);
        const dot = direction.dot(smallest_axis);

        // If dot < 0, reverse the axis
        const mtv_direction = dot < 0
            ? smallest_axis.scale(-1)
            : smallest_axis;

        return {
            collided: true,
            mtv: mtv_direction.scale(min_overlap)
        };
    }

    return { collided: false };
}