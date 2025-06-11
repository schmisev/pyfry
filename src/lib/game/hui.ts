import { vec2, HuiVector } from "./hui.vector";
import { HuiBody } from "./hui.body";
import { hex, rnd, rndi, rndr } from "./hui.utils";
import { HuiSound } from "./hui.sound";
import { HuiTimer } from "./hui.timer";
import { HuiLayer, HuiSprite } from "./hui.layer";
import type { HuiThing } from "./hui.thing";
import { HuiRandom } from "./hui.random";

import type { PyodideInterface } from "pyodide";
import { HuiImage } from "./hui.image";

export type HuiSetupFunction = () => void;
export type HuiDrawFunction = (dt: number) => void;

export class HuiGame {
  #doc: Document;
  #cvs: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  
  #pyodide?: PyodideInterface;
  #create_proxy?: (obj: any) => any;

  width: number;
  height: number;

  time: number = 0;

  mouse: HuiVector = vec2();
  
  get mx() { return this.mouse.x };
  get my() { return this.mouse.y };

  #keymap: Map<string, [boolean, boolean]> = new Map<string, [boolean, boolean]>();

  // layers
  bg: HuiLayer;
  mg: HuiLayer;
  fg: HuiLayer;
  ui: HuiLayer;

  // layers
  #layers: HuiLayer[] = []

  // sound player
  sound = new HuiSound();

  // things (to update)
  #things: (HuiThing | object)[] = [];

  // debug
  show_debug: boolean = false;

  constructor(doc: Document, cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D, create_proxy: (obj: any) => any) {
    this.#cvs = cvs;
    this.#ctx = ctx;
    this.#doc = doc;

    this.#create_proxy = create_proxy;

    this.width = cvs.width;
    this.height = cvs.height;

    this.bg = new HuiLayer(cvs.width, cvs.height);
    this.mg = new HuiLayer(cvs.width, cvs.height);
    this.fg = new HuiLayer(cvs.width, cvs.height);
    this.ui = new HuiLayer(cvs.width, cvs.height);

    cvs.tabIndex = -1;
    cvs.oncontextmenu = (ev: Event) => ev.preventDefault();

    cvs.onkeydown = (ev: KeyboardEvent) => {
      if (this.#keymap.has(ev.key)) {
        this.#keymap.set(ev.key, [false, false]);
      } else {
        this.#keymap.set(ev.key, [true, false]);
      }
    }

    cvs.onkeyup = (ev: KeyboardEvent) => {
      this.#keymap.set(ev.key, [false, true]);
    }

    cvs.onpointerdown = (ev: PointerEvent) => {
      cvs.setPointerCapture(ev.pointerId);

      let key = "m" + ev.button;
      if (this.#keymap.has(key)) {
        this.#keymap.set(key, [false, false]);
      } else {
        this.#keymap.set(key, [true, false]);
      }
    }

    cvs.onpointerup = (ev: PointerEvent) => {
      cvs.releasePointerCapture(ev.pointerId);

      let key = "m" + ev.button;
      this.#keymap.set(key, [false, true]);
    }

    doc.onpointermove = (ev: PointerEvent) => {
      this.mouse.x = ev.clientX - cvs.offsetLeft;
      this.mouse.y = ev.clientY - cvs.offsetTop;
    }

    cvs.onblur = (ev: FocusEvent) => {
      this.#keymap.clear();
    }
  }

  debug(on?: boolean) {
    if (on === undefined) {
      this.show_debug = !this.show_debug;
    } else {
      this.show_debug = on;
    }
  }

  /**
   * Überprüft, ob eine Tastatur- oder Maustaste gedrückt wurde.
   * ```python
   * # Beispiel
   * if hui.is_pressed("ArrowRight"):
   *   x += 5
   * ```
   * Die Maustasten heißen `"m0"`, `"m1"` und `"m2"`.
   * Buchstabentasten können z.B. mit "a" oder "z" abgefragt werden. Achtung, Groß- und Kleinschreibung wird beachtet!
   * Die Namen der restlichen Tasten findet man hier: https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
   * Häufig verwendet werden `"ArrowDown"`, `"ArrowLeft"`, `"Space"`, `"Enter"` und `"Backspace"`.
   * @param key z.B. `"m0"`, `"a"` oder `"Space"`
   * @returns 
   */
  is_pressed(key: string): boolean {
    return this.#keymap.has(key);
  }

  just_pressed(key: string) {
    this.is_pressed
    return this.#keymap.get(key)?.[0] || false;
  }

  just_released(key: string) {
    return this.#keymap.get(key)?.[1] || false;
  }

  // input convenience
  axis_pressed(a: string, b: string) {
    let dir_1d = 0
    dir_1d += this.is_pressed(a) ? -1 : 0;
    dir_1d += this.is_pressed(b) ? 1 : 0;
    return dir_1d;
  }

  dir_pressed(u: string, d: string, l: string, r: string) {
    return vec2(
      this.axis_pressed(l, r),
      this.axis_pressed(u, d),
    )
  }

  // add game object
  add(anything: Object) {
    let obj = anything;
    // to ensure pyodide compatibility
    if (obj.constructor.name === "PyProxy" && this.#create_proxy) {
      obj = this.#create_proxy(obj);
      this.show_debug && console.log(`<hui> added proxy of ${anything}`);
    }
    let thing = obj;
    "setup" in thing && typeof thing.setup === "function" && thing.setup();
    this.#things.push(thing);
    return thing;
  }

  remove(thing: HuiThing | object) {
    (thing as any)._remove_ = true;
  }

  // layers
  add_layer() {
    const new_layer = new HuiLayer(this.width, this.height);
    this.#layers.push(new_layer);
    return new_layer;
  }

  // timers
  new_timer(duration: number, does_repeat: boolean = false) {
    const new_timer = new HuiTimer(duration, does_repeat, false);
    return new_timer;
  }

  /**
   * Fügt einen neuen (globalen) Timer zum Spiel hinzu.
   * ACHTUNG: Dieser Timer zerstört sich selbst, nachdem er abgelaufen ist.
   * Das macht ihn praktisch, wenn man z.B. ein Objekt nach einer bestimmten Zeit zerstören will:
   * ```python
   * class Bullet:
   *   def setup(self):
   *     self.timer = hui.add_timer(2)
   *     self.timer.start()
   *
   *   def draw(self, dt):
   *     if (self.timer.just_finished):
   *       hui.remove(self)
   *
   * # ...
   * def setup():
   *   hui.add(Bullet())
   * ```
   * @param duration 
   * @param does_repeat 
   * @return
   */
  add_timer(duration: number, does_repeat: boolean = false) {
    const new_timer = new HuiTimer(duration, does_repeat, true);
    this.#things.push(new_timer);
    return new_timer;
  }

  // bodies
  new_body(x: number, y: number, vx: number, vy: number) {
    const new_body = new HuiBody(x, y, vx, vy);
    return new_body;
  }

  // vectors
  new_vec2(x?: number, y?: number) {
    const new_vec2 = vec2(x, y);
    return new_vec2;
  }

  // sprites
  new_sprite(w: number, h: number) {
    const new_sprite = new HuiSprite(w, h);
    return new_sprite;
  }

  // sprites
  new_image(src: string) {
    const new_image = new HuiImage(src);
    return new_image;
  }

  // new random
  new_random(period: number) {
    const new_random = new HuiRandom(period);
    return new_random;
  }

  #update_keymap() {
    for (const [key, value] of this.#keymap.entries()) {
      if (value[1]) {
        this.#keymap.delete(key);
        continue;
      }
      if (value[0]) {
        this.#keymap.set(key, [false, value[1]]);
      }
    }
  }

  #setup_things() {
    // not needed right now because hui.add(...) calls the setup function
  }

  #tick_things(dt: number) {
    for (const thing of this.#things) {
      "tick" in thing && typeof thing.tick === "function" && thing.tick(dt);
    }
  }

  #draw_things(dt: number) {
    for (const thing of this.#things) {
      "draw" in thing && typeof thing.draw === "function" && thing.draw(dt);
    }
  }

  #remove_things() {
    let i = 0;
    while (i < this.#things.length) {
      const thing = this.#things[i];
      if ("_remove_" in thing && thing._remove_) {
        let thing: any = this.#things.splice(i, 1);
        this.show_debug && console.log(`<hui> removed ${thing}`);
      } else i++;
    }
  }

  #draw_layers() {
    this.#ctx.clearRect(0, 0, this.#cvs.width, this.#cvs.height);

    this.#ctx.drawImage(this.bg.cvs, 0, 0);
    this.#ctx.drawImage(this.mg.cvs, 0, 0);

    for (const layer of this.#layers) {
      this.#ctx.drawImage(layer.cvs, 0, 0);
    }

    this.#ctx.drawImage(this.fg.cvs, 0, 0);
    this.#ctx.drawImage(this.ui.cvs, 0, 0);
  }

  prepare() {
    this.setup();
    this.#setup_things();
  }

  step(t: number, dt: number) {
    // set game time
    this.time = t;
    // tick all things
    this.#tick_things(dt);
    // run draw function and then draw "things"
    this.draw(dt);
    this.#draw_things(dt);
    // draw layer stack
    this.#draw_layers();
    // update inputs
    this.#update_keymap();
    // remove things if marked
    this.#remove_things();
  }

  // to be overwritten
  setup: HuiSetupFunction = () => {};
  draw: HuiDrawFunction = (dt: number) => {};

  // "static"
  hex(r: number, g: number, b: number) { return hex(r, g, b); }
  rnd() { return rnd() };
  rndi(min: number, max: number) { return rndi(min, max) };
  rndr(min: number, max: number) { return rndr(min, max) };

  clamp(value: number, min: number, max: number) {
    return (value < min) ? min : (value > max) ? max : value;
  }

  wrap(value: number, min: number, max: number) {
    return (value > max) ? min + (value - max) : (value < min) ? max - (min - value) : value;
  }

  lerp(a: number | HuiVector, b: number | HuiVector, t: number) {
    if (typeof a === "number" && typeof b === "number")
      return a + (b - a) * t;
    else if (a instanceof HuiVector && b instanceof HuiVector)
      return a.add(b.sub(a).scale(t));
    else
      throw TypeError("lerp(a, b, t) can only be used on two numbers or two vectors!")
  }

  sign(value: number | HuiVector) {
    if (typeof value === "number")
      return (value < 0) ? -1 : (value > 0) ? 1 : 0;
    else
      return value.sign();
  }

  move_towards(a: number | HuiVector, b: number | HuiVector, delta: number) {
    if (typeof a === "number" && typeof b === "number") {
      let step = Math.min(Math.abs(b - a), delta);
      let dir = Math.sign(b - a);
      return a + dir * step;
    } else if (a instanceof HuiVector && b instanceof HuiVector) {
      let step = Math.min(a.to(b).len(), delta);
      let dir = a.to(b).norm();
      return a.add(dir.scale(step));
      return 
    }
    else
      throw TypeError("move_towards(a, b, delta) can only be used on two numbers or two vectors!")
  }
}


