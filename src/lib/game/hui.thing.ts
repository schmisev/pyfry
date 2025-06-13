import type { PyProxy } from "pyodide/ffi";

export abstract class HuiThing {
  __id__: number | undefined;

  setup?(): void {};

  tick?(dt: number): void {};

  draw?(dt: number): void {};

  toString() {
    return `<hui:thing>`
  }
}

export type HuiCursedThing = PyProxy | HuiThing;