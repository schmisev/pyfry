import type { PyProxy } from "pyodide/ffi";
import { HuiThing } from "./hui.thing";
import { HuiVector, vec2 } from "./hui.vector";

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