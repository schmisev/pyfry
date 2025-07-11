import type { PyProxy } from "pyodide/ffi";
import type { HuiLayer } from "./hui.layer";

export abstract class HuiThing {
  __id__: number | undefined;

  setup?(): void {};

  tick?(dt: number): void {};

  draw?(dt: number): void {};

  update?(): void {};

  draw_debug?(layer: HuiLayer): void {};

  remove?(): void {};

  toString() {
    return `<hui:thing>`
  }
}

export type HuiCursedThing = PyProxy | HuiThing;