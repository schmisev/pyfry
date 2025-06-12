import { HuiVector, vec2 } from "./hui.vector";

export type BodyShapeType = "ellipse" | "rect";

export class HuiBody {
  pos: HuiVector;
  vel: HuiVector;
  width: number;
  height: number;
  angle: number = 0;
  type: BodyShapeType;

  constructor(x: number, y: number, vx: number, vy: number, w: number = 50, h: number = 50, type: BodyShapeType = "rect") {
    this.pos = vec2(x, y);
    this.vel = vec2(vx, vy);

    this.width = w;
    this.height = h;

    this.type = type;
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
