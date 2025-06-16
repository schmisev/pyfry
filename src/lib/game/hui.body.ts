import type { HuiLayer } from "./hui.layer";
import { HuiThing } from "./hui.thing";
import { lerp } from "./hui.utils";
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
   * Beschleunigung (**acc**eleration) als Vektor.<br>
   * Beispiel: _Setzen der Beschleunigung in y-Richtung_
   * ```python
   * body = hui.new_body(0, 0, 0, 0, 0, 0) # Die letzten 2 Nullen geben die Beschleunigung an
   * body.acc.y = 9.81 # Die Beschleunigung in y-Richtung ist nun 9.81px/s^2
   * ```
   */
  force: HuiVector;
  mass: number = 1;

  #last_pos: HuiVector;
  #current_pos: HuiVector;

  #last_vel: HuiVector;
  #current_vel: HuiVector;

  #accumulator: number = 0;
  #fixed_dt: number = 0.01; // 100fps

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

      // do the integration
      this.#current_vel = this.#current_vel.add(this.force.scale(this.#fixed_dt));
      this.#current_pos = this.#current_pos.add(this.#current_vel.scale(this.#fixed_dt));

      this.#accumulator -= this.#fixed_dt; // consume simulation time
    }

    const a = this.#accumulator / this.#fixed_dt; // interpolation variable
    // console.log(a)

    this.#vel = lerp(this.#last_vel, this.#current_vel, a);
    this.#pos = lerp(this.#last_pos, this.#current_pos, a);
  }

  tick(dt: number) {
    this.move(dt);
  }
}

export abstract class HuiPhysicsBody extends HuiBody {
  abstract angle: number;

  abstract is_inside(pos: HuiVector): boolean;
  abstract is_touching(body: HuiPhysicsBody): boolean;

  local_pos(pos: HuiVector) {
    return this.pos.to(pos).rotate(-this.angle);
  }

  abstract collision_points(): Generator<HuiVector, void, unknown>;
}

export class HuiBox extends HuiPhysicsBody {
  size: HuiVector;
  angle: number;

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

  is_inside(pos: HuiVector) {
    const lp = this.local_pos(pos);
    return lp.x < -this.size.x / 2 || lp.x > this.size.x / 2 || lp.y < -this.size.y / 2 || lp.y > this.size.y / 2;
  }

  *collision_points(): Generator<HuiVector, void, unknown> {
    const [w, h] = this.size.xyHalf;
    yield this.pos.move(w, h); // top right
    yield this.pos.move(-w, h); // top left
    yield this.pos.move(w, -h); // bottom left
    yield this.pos.move(-w, -h); // bottom left
  }

  is_touching(body: HuiPhysicsBody) {
    switch (body.type) {
      case "point":
        return this.is_inside(body.pos);
      case "rectangle":
        for (const p of body.collision_points()) {
          if (this.is_inside(p)) return true;
        }
        for (const p of this.collision_points()) {
          if (body.is_inside(p)) return true;
        }
        return false;
    }
    const UNREACHABLE: never = body.type;
  }

  draw_debug(layer: HuiLayer): void {
    const ctx = layer.ctx;
    ctx.save();
    ctx.reset();
    ctx.strokeStyle = "red";
    ctx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.restore();
  }
}