export abstract class HuiThing {
  _remove_: boolean = false;

  setup(): void {};

  tick(dt: number): void {};

  draw(dt: number): void {};

  toString() {
    return `<hui:thing _rm_=${!!this._remove_}>`
  }
}
