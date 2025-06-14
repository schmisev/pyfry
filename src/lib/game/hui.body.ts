import { HuiThing } from "./hui.thing";
import { HuiVector, vec2 } from "./hui.vector";

export type BodyShapeType = "ellipse" | "rect";

export class HuiBody extends HuiThing {
  pos: HuiVector;
  vel: HuiVector;
  acc: HuiVector;
  angle: number = 0;

  constructor(x: number, y: number, vx: number = 0, vy: number = 0, ax: number = 0, ay: number = 0) {
    super();
    this.pos = vec2(x,  y);
    this.vel = vec2(vx, vy);
    this.acc = vec2(ax, ay);
  }

  // for convenience
  get x(): number { return this.pos.x; };
  get y(): number { return this.pos.y; };
  get vx(): number { return this.vel.x; };
  get vy(): number { return this.vel.y; };
  get ax(): number { return this.acc.x; };
  get ay(): number { return this.acc.y; };
  set x(value: number) { this.pos.x = value; };
  set y(value: number) { this.pos.y = value; };
  set vx(value: number) { this.vel.x = value; };
  set vy(value: number) { this.vel.y = value; };
  set ax(value: number) { this.acc.x = value; };
  set ay(value: number) { this.acc.y = value; };

  get speed(): number { return this.vel.len(); };
  set speed(value: number) { this.vel = this.vel.norm(value); };

  move(dt: number) {
    this.vel = this.vel.add(this.acc.scale(dt));
    this.pos = this.pos.add(this.vel.scale(dt));
  }

  tick(dt: number) {
    this.move(dt);
  }
}
