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

export function reavg(old_v: number, new_v: number, count: number) {
  if (count <= 0) count = 1;
  return (old_v * (count-1) + new_v) / count;
}