import type { HuiLayer } from "./hui.layer";
import { HuiThing } from "./hui.thing";
import { lerp, SAT_collision } from "./hui.utils";
import { HuiVector, vec2 } from "./hui.vector";

export type BodyShapeType = "point" | "rectangle";

/**
 * Enthält Informationen über einen Körper, der sich bewegt.
 * Das schließt die Position, Geschwindigkeit und die aktuelle Beschleunigung ein.
 * Um einen neuen HuiBody zu erzeugen, nutzt man `hui.new_body(...)`.<br>
 * _Kopieren und Probieren!_
 * ```python
 * # Erstellt einen neuen HuiBody in der Bildmitte, gibt ihm eine Startgeschwindigkeit von [100, 30], eine Beschleunigung von 100 nach unten und fügt ihn dem Spiel hinzu, damit er automatisch geupdated wird.
 * body = hui.new_body(hui.width / 2, hui.height / 2, 100, 30, 0, 100)
 * hui.add(body)
 * 
 * # Nun zeichnen wir dort, wo sich der Körper befindet, einen Kreis
 * def setup():
 *   hui.bg.flood("lightblue")
 * 
 * def draw(dt):
 *   hui.mg.clear()
 *   hui.mg.circle(body.x, body.y, 30)
 * ```
 */
export class HuiBody extends HuiThing {
  type: BodyShapeType = "point";
  static: boolean = false;

  /**
   * **Pos**ition als Vektor.<br>
   * Beispiel: _Ausgabe der x- und y-Koordinate_
   * ```python
   * body = hui.new_body(15, 10)
   * print(body.pos.x) # Ausgabe: 15
   * print(body.pos.y) # Ausgabe: 10
   * ```
   */
  get pos() { return this.#pos; }
  set pos(value) {
    this.#current_pos = value;
    this.#last_pos = value;
    this.#pos = value;
  }
  #pos: HuiVector;
  /**
   * Geschwindigkeit (**vel**ocity) als Vektor.<br>
   * Beispiel: _Ausgabe der Gesamtgeschwindigkeit_
   * ```python
   * body = hui.new_body(0, 0, 4, 3) # 4 & 3 sind die x- und y-Geschwindigkeit
   * print(body.vel.len()) # Ausgabe: 5
   * ```
   */
  get vel() { return this.#vel; }
  set vel(value) {
    this.#current_vel = value;
    this.#last_vel = value;
    this.#vel = value;
  }
  #vel: HuiVector;
  /**
   * Kraft, die auf den Körper wirkt, als Vektor.<br>
   * Beispiel: _Setzen der Kraft in y-Richtung_
   * ```python
   * body = hui.new_body(0, 0, 0, 0, 0, 0) # Die letzten 2 Nullen geben die Beschleunigung an
   * body.force.y = 9.81 # Die Kraft in y-Richtung ist nun 9.81px/s^2
   * ```
   */
  force: HuiVector;
  gravity: number = 0;
  mass: number = 1;

  get angle() { return this.#angle; }
  set angle(value: number) {
    this.#last_angle = value;
    this.#current_angle = value;
    this.#angle = value;
  }

  get angular_vel() { return this.#angular_vel; }
  set angular_vel(value: number) {
    this.#last_angular_vel = value;
    this.#current_angular_vel = value;
    this.#angular_vel = value;
  }

  #last_pos: HuiVector;
  #current_pos: HuiVector;

  #last_vel: HuiVector;
  #current_vel: HuiVector;

  #last_angle: number = 0;
  #current_angle: number = 0;
  #angle: number = 0;

  #last_angular_vel: number = 0;
  #current_angular_vel: number = 0;
  #angular_vel: number = 0;

  torque: number = 0;

  #accumulator: number = 0;
  #fixed_dt: number = 0.01666; // 60fps

  constructor(x: number, y: number, vx: number = 0, vy: number = 0, fx: number = 0, fy: number = 0) {
    super();
    this.#pos = vec2(x,  y);
    this.#last_pos = vec2(x, y);
    this.#current_pos = vec2(x, y);

    this.#vel = vec2(vx, vy);
    this.#last_vel = vec2(vx, vy);
    this.#current_vel = vec2(vx, vy);

    this.force = vec2(fx, fy);
  }

  // for convenience
  get x(): number { return this.#pos.x; };
  get y(): number { return this.#pos.y; };
  set x(value: number) {
    this.#last_pos.x = value;  
    this.#current_pos.x = value; 
    this.#pos.x = value;
  };
  set y(value: number) { 
    this.#last_pos.y = value; 
    this.#current_pos.y = value; 
    this.#pos.y = value;
  };

  get vx(): number { return this.#vel.x; };
  get vy(): number { return this.#vel.y; };
  set vx(value: number) { 
    this.#last_vel.x = value; 
    this.#current_vel.x = value; 
    this.#vel.x = value;
  };
  set vy(value: number) {
    this.#last_vel.y = value;  
    this.#current_vel.y = value; 
    this.#vel.y = value;
  };

  get fx(): number { return this.force.x; };
  get fy(): number { return this.force.y; };
  set fx(value: number) { this.force.x = value; };
  set fy(value: number) { this.force.y = value; };

  get ax(): number { return this.force.x / this.mass; };
  get ay(): number { return this.force.y / this.mass; };
  set ax(value: number) { this.force.x = value * this.mass; };
  set ay(value: number) { this.force.y = value * this.mass; };

  get speed(): number { return this.#vel.len(); };
  set speed(value: number) { this.#vel = this.#vel.norm(value); };

  move(dt: number) {
    this.#accumulator += (dt > 0.1 ? 0.1 : dt); // at least 10fps

    while (this.#accumulator >= this.#fixed_dt) {
      this.#last_pos = this.#current_pos;
      this.#last_vel = this.#current_vel;
      
      this.#last_angle = this.#current_angle;
      this.#last_angular_vel = this.#current_angular_vel;

      // do the integration
      if (!this.static) {
        this.#current_vel = this.#current_vel.add(this.force.scale(this.#fixed_dt / this.mass));
        this.#current_vel.y += this.gravity * this.#fixed_dt; // apply gravity seperately
        this.#current_pos = this.#current_pos.add(this.#current_vel.scale(this.#fixed_dt));
        this.#current_angular_vel += this.torque / this.mass * this.#fixed_dt;
        this.#current_angle += this.#current_angular_vel * this.#fixed_dt;
      }

      this.#accumulator -= this.#fixed_dt; // consume simulation time
    }

    const a = this.#accumulator / this.#fixed_dt; // interpolation variable
    // console.log(a)

    this.#vel = lerp(this.#last_vel, this.#current_vel, a);
    this.#pos = lerp(this.#last_pos, this.#current_pos, a);
    this.#angular_vel = lerp(this.#last_angular_vel, this.#current_angular_vel, a);
    this.#angle = lerp(this.#last_angle, this.#current_angle, a);
  }

  tick(dt: number) {
    this.move(dt);
  }

  local_pos(pos: HuiVector) {
    return this.pos.to(pos).rotate(-this.angle);
  }

  *collision_points(): Generator<HuiVector, void, unknown> {
    yield this.pos;
  }

  contains(pos: HuiVector): boolean {
    return false;
  };

  is_touching(body: HuiBody) {
    switch (body.type) {
      case "point":
        return this.contains(body.pos);
      case "rectangle":
        return body.contains(this.pos);
    }
    const UNREACHABLE: never = body.type;
  }
}

export class HuiBox extends HuiBody {
  type: BodyShapeType = "rectangle";
  size: HuiVector;

  get w(): number {
    return this.size.x;
  }

  get h(): number {
    return this.size.y;
  }

  constructor(x: number, y: number, w: number, h: number) {
    super(x, y);
    this.size = vec2(w, h);
    this.angle = 0;
  }

  contains(pos: HuiVector) {
    const lp = this.local_pos(pos);
    return lp.x > -this.size.x / 2 && lp.x < this.size.x / 2 && lp.y > -this.size.y / 2 && lp.y < this.size.y / 2;
  }

  *collision_points(): Generator<HuiVector, void, unknown> {
    const [w, h] = this.size.xyHalf;
    yield this.pos.add(vec2(w, h).rotate(this.angle));
    yield this.pos.add(vec2(-w, h).rotate(this.angle));
    yield this.pos.add(vec2(w, -h).rotate(this.angle));
    yield this.pos.add(vec2(-w, -h).rotate(this.angle));
  }

  is_touching(body: HuiBody) {
    switch (body.type) {
      case "point":
        return this.contains(body.pos);
      case "rectangle":
        return SAT_collision(this, body as HuiBox).collided;
    }
    const UNREACHABLE: never = body.type;
  }

  draw_debug(layer: HuiLayer, mouse?: HuiVector): void {
    const ctx = layer.ctx;
    ctx.save();
    ctx.resetTransform();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "red";
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
    ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
    if (mouse && this.contains(mouse)) {
      ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    }
    ctx.resetTransform();
    for (const point of this.collision_points()) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.ellipse(...point.xy, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  toString(): string {
    return `<hui:box>`
  }
}