import { HuiVector, vec2 } from "./hui.vector";


export class HuiBody {
  pos: HuiVector;
  vel: HuiVector;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.pos = vec2(x, y);
    this.vel = vec2(vx, vy);
  }

  // for convenience
  get x(): number { return this.pos.x; };
  get y(): number { return this.pos.y; };
  get vx(): number { return this.vel.x; };
  get vy(): number { return this.vel.y; };
  set x(value: number) { this.pos.x = value; };
  set y(value: number) { this.pos.y = value; };
  set vx(value: number) { this.vel.x = value; };
  set vy(value: number) { this.vel.y = value; };

  get speed(): number { return this.vel.len(); };
  set speed(value: number) { this.vel = this.vel.norm(value); };

  move(dt: number) {
    this.pos = this.pos.add(this.vel.scale(dt));
  }
}
