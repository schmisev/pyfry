import { Body, BoxShape, Chain, Circle, CircleShape, Fixture, ManifoldType, Settings, Vec2, World, type BodyType } from "planck";
import { HuiVector, vec2 } from "./hui.vector";
import { HuiThing } from "./hui.thing";
import type { HuiLayer } from "./hui.layer";

/**
 * Ein Wrapper für planck.js
 */
export class HuiPhysics {
  #accumulator = 0;
  #fixed_dt = 0.01666; // 60fps
  world = new World({
    gravity: {x: 0, y: 500},
  })

  #boundary: Body;

  constructor(w: number, h: number) {
    // setting up world border
    this.#boundary = this.world.createBody({
      position: {x: 0, y: 0}
    })

    this.#boundary.createFixture({
      shape: new Chain([
        {x: 0, y: 0},
        {x: 0, y: h},
        {x: w, y: h},
        {x: w, y: 0},
      ], true)
    })

    this.boundary(false);

    // general settings
    Settings.lengthUnitsPerMeter = 100;
  }

  boundary(active: boolean) {
    this.#boundary.setActive(active);
  }

  get gravity(): number {
    return this.world.getGravity().y;
  }
  set gravity(value: number) {
    this.world.setGravity({x: 0, y: value});
  }

  add_box(x: number, y: number, w: number, h: number, type: BodyType = "dynamic") {
    return new HuiPhysicsBox(this.world, x, y, w, h, type);
  }

  add_disc(x: number, y: number, r: number, type: BodyType = "dynamic") {
    return new HuiPhysicsDisc(this.world, x, y, r, type);
  }

  step(dt: number) {
    this.#accumulator += (dt > 0.1 ? 0.1 : dt);
    while (this.#accumulator >= this.#fixed_dt) {
      this.world.step(this.#fixed_dt, 10, 8);
      this.#accumulator -= this.#fixed_dt;
    }

    this.world.clearForces();
  }
}

export abstract class HuiPhysicsBody extends HuiThing {
  abstract body: Body;

  get pos(): HuiVector {
    const pos = this.body.getPosition()
    return vec2(pos.x, pos.y);
  }
  set pos(value: HuiVector) {
    this.body.setPosition({x: value.x, y: value.y});
  }

  get vel(): HuiVector {
    const vel = this.body.getLinearVelocity()
    return vec2(vel.x, vel.y);
  }
  set vel(value: HuiVector) {
    this.body.setLinearVelocity({x: value.x, y: value.y});
  }

  get x(): number { return this.pos.x; };
  get y(): number { return this.pos.y; };
  set x(value: number) {
    this.body.setPosition({x: value, y: this.y});
  };
  set y(value: number) { 
    this.body.setPosition({x: this.x, y: value});
  };

  get vx(): number { return this.vel.x; };
  get vy(): number { return this.vel.y; };
  set vx(value: number) {
    this.body.setLinearVelocity({x: value, y: this.vy});
  };
  set vy(value: number) { 
    this.body.setLinearVelocity({x: this.vx, y: value});
  };

  get angle(): number { return this.body.getAngle() };
  set angle(value: number) { this.body.setAngle(value) };

  apply_force(fx: number, fy: number) {
    this.body.applyForceToCenter({
      x: fx * 1000, 
      y: fy * 1000,
    })
  }

  apply_torque(torque: number) {
    this.body.applyTorque(torque * 100000);
  }

  is_on_ground: boolean = false;
  is_on_wall: boolean = false;
  is_on_ceiling: boolean = false;

  #reset_collisions() {
    this.is_on_ground = false;
    this.is_on_wall = false;
    this.is_on_ceiling = false;
  }

  #classify_collisions(): boolean {
    for (let ce = this.body.getContactList(); ce; ce = ce.next) {
      let c = ce.contact;
      let n = c.getWorldManifold(null)?.normal;
      if (!n) continue;
      let v = HuiVector.from_vec2(n);
      let angle = v.angle();
      if (!this.is_on_ground && angle > -Math.PI * 0.7 && angle < -Math.PI * 0.3) this.is_on_ground = true;
      if (!this.is_on_ceiling && angle > Math.PI * 0.3 && angle > Math.PI * 0.7) this.is_on_ceiling = true;
      if (!this.is_on_wall && angle > -Math.PI * 0.2 && angle < Math.PI * 0.2) this.is_on_wall = true;
      if (!this.is_on_wall && angle < -Math.PI * 0.8 && angle > Math.PI * 0.8) this.is_on_wall = true;
    }
    return true;
  }

  tick(dt: number) {
    this.#reset_collisions();
    this.#classify_collisions();
  }
}

export class HuiPhysicsBox extends HuiPhysicsBody {
  body: Body;

  constructor(world: World, x: number, y: number, w: number, h: number, type: BodyType = "dynamic") {
    super();
    this.body = world.createBody({
      type: type,
      position: {x, y},
      angle: 0,
    })

    this.body.createFixture({
      shape: new BoxShape(w/2, h/2),
      density: 0.1,
      friction: 0.3,
    })

    this.width = w;
    this.height = h;
  }

  readonly width: number;
  readonly height: number;

  draw_debug(layer: HuiLayer, mouse?: HuiVector): void {
    const ctx = layer.ctx;
    ctx.save();
    ctx.resetTransform();
    ctx.translate(...this.pos.xy);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "red";
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
    ctx.beginPath();
    ctx.rect(-this.width/2, -this.height/2, this.width, this.height);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export class HuiPhysicsDisc extends HuiPhysicsBody {
  body: Body;

  constructor(world: World, x: number, y: number, r: number, type: BodyType = "dynamic") {
    super();
    this.body = world.createBody({
      type: type,
      position: {x, y},
      angle: 0,
    })

    this.body.createFixture({
      shape: new Circle(r),
      density: 0.1,
      friction: 0.3,
    })

    this.radius = r;
  }

  readonly radius: number;

  draw_debug(layer: HuiLayer, mouse?: HuiVector): void {
    const ctx = layer.ctx;
    ctx.save();
    ctx.resetTransform();
    ctx.translate(...this.pos.xy);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "red";
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}