import { HuiThing } from "./hui.thing";
import { HuiVector, vec2 } from "./hui.vector";

export type BodyShapeType = "ellipse" | "rect";

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
  /**
   * **Pos**ition als Vektor.<br>
   * Beispiel: _Ausgabe der x- und y-Koordinate_
   * ```python
   * body = hui.new_body(15, 10)
   * print(body.pos.x) # Ausgabe: 15
   * print(body.pos.y) # Ausgabe: 10
   * ```
   */
  pos: HuiVector;
  /**
   * Geschwindigkeit (**vel**ocity) als Vektor.<br>
   * Beispiel: _Ausgabe der Gesamtgeschwindigkeit_
   * ```python
   * body = hui.new_body(0, 0, 4, 3) # 4 & 3 sind die x- und y-Geschwindigkeit
   * print(body.vel.len()) # Ausgabe: 5
   * ```
   */
  vel: HuiVector;
  /**
   * Beschleunigung (**acc**eleration) als Vektor.<br>
   * Beispiel: _Setzen der Beschleunigung in y-Richtung_
   * ```python
   * body = hui.new_body(0, 0, 0, 0, 0, 0) # Die letzten 2 Nullen geben die Beschleunigung an
   * body.acc.y = 9.81 # Die Beschleunigung in y-Richtung ist nun 9.81px/s^2
   * ```
   */
  acc: HuiVector;
  /**
   * Rotationswinkel des Körpers<br>
   * Aktuell nutzlos.
   */
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
