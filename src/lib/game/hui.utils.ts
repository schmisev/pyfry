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