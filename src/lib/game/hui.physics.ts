import { Body, BoxShape, Fixture, Settings, World, type BodyType } from "planck";
import { vec2, type HuiVector } from "./hui.vector";
import { HuiThing } from "./hui.thing";
import type { HuiLayer } from "./hui.layer";

export class HuiPhysics {
  #accumulator = 0;
  #fixed_dt = 0.01; // 100fps
  world = new World({
    gravity: {x: 0, y: 500},
  })

  constructor() {
    Settings.lengthUnitsPerMeter = 100;
  }

  add_box(x: number, y: number, w: number, h: number, type: BodyType = "dynamic") {
    return new HuiPhysicsBox(this.world, x, y, w, h, type);
  }

  step(dt: number) {
    this.#accumulator += (dt > 0.1 ? 0.1 : dt);
    while (this.#accumulator >= this.#fixed_dt) {
      this.world.step(this.#fixed_dt, 10, 8);
      this.#accumulator -= this.#fixed_dt;
    }

    // this.world.clearForces();
  }
}

export class HuiPhysicsBox extends HuiThing {
  #body: Body;

  constructor(world: World, x: number, y: number, w: number, h: number, type: BodyType = "dynamic") {
    super();
    this.#body = world.createBody({
      type: type,
      position: {x, y},
      angle: 0,
    })

    this.#body.createFixture({
      shape: new BoxShape(w/2, h/2),
      density: 1.0,
      friction: 0.3,
    })

    this.w = w;
    this.h = h;
  }

  readonly w: number;
  readonly h: number;

  get pos(): HuiVector {
    const pos = this.#body.getPosition()
    return vec2(pos.x, pos.y);
  }
  set pos(value: HuiVector) {
    this.#body.setPosition({x: value.x, y: value.y});
  }

  get vel(): HuiVector {
    const vel = this.#body.getLinearVelocity()
    return vec2(vel.x, vel.y);
  }
  set vel(value: HuiVector) {
    this.#body.setLinearVelocity({x: value.x, y: value.y});
  }

  get angle(): number { return this.#body.getAngle() };
  set angle(value: number) { this.#body.setAngle(value) };

  apply_force(fx: number, fy: number) {
    this.#body.applyForceToCenter({
      x: fx, 
      y: fy
    })
  }

  draw_debug(layer: HuiLayer, mouse?: HuiVector): void {
    const ctx = layer.ctx;
    ctx.save();
    ctx.resetTransform();
    ctx.translate(...this.pos.xy);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "red";
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
    ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.restore();
  }
}