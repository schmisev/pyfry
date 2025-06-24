import { vec2, HuiVector } from "./hui.vector";
import { HuiMover, HuiBox, HuiDisc } from "./hui.mover";
import { call_method_if_it_exists, clamp, has_method, hex, is_py_proxy, lerp, move_towards, reavg, rnd, rndi, rndr, SAT_collision, sign, wrap } from "./hui.utils";
import { HuiSound } from "./hui.sound";
import { HuiTimer } from "./hui.timer";
import { HuiLayer, HuiSprite } from "./hui.layer";
import { HuiThing, type HuiCursedThing } from "./hui.thing";
import { HuiRandomTimer } from "./hui.random";
import { HuiImage } from "./hui.image";
import type { PyProxy } from "pyodide/ffi";
import { HuiPhysics } from "./hui.physics";

export type HuiDiagnostics = {
  __ft__: [number, number, number, number, number], // frame times
  __fc__: number, // frame count
  fps: number,
  tick_dt: number,
  draw_dt: number,
  draw_things_dt: number,
  draw_layers_dt: number,
  key_dt: number,
  removal_dt: number,
  full_dt: number,
};

export type NodeType = "class" | "method" | "set" | "get" | "attribute";
export type NodeAccess = "private" | "hidden" | "public";
export type NodeDoc = {
  className: string,
  signature: string,
  jsDoc: string,
  type: NodeType,
  access: NodeAccess,
};

export type HuiSetupFunction = () => void;
export type HuiTickFunction = (dt: number) => void;
export type HuiDrawFunction = (dt: number) => void;

export class HuiGame {
  diagnostics: HuiDiagnostics = {
    __ft__: [0, 0, 0, 0, 0],
    fps: 0,
    tick_dt: 0,
    draw_dt: 0,
    draw_things_dt: 0,
    draw_layers_dt: 0,
    key_dt: 0,
    removal_dt: 0,
    full_dt: 0,
    __fc__: 0,
  }

  #cvs: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  
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
  dbg: HuiLayer;

  // layers
  #layers: HuiLayer[] = [];
  *#all_layers(): Generator<HuiLayer, void, unknown> {
    yield this.bg;
    yield this.mg;

    for (const layer of this.#layers) {
      yield layer;
    }

    yield this.fg;
    yield this.ui;
    yield this.dbg;
  }

  // sound player
  sound = new HuiSound();

  // planck physics
  physics: HuiPhysics;

  // things (to update)
  #things: HuiCursedThing[] = [];
  #has_tick: boolean[] = [];
  #has_draw: boolean[] = [];
  #has_draw_debug: boolean[] = [];
  #is_physics_body: boolean[] = [];
  #to_remove: boolean[] = [];
  #children_of_thing: Set<number>[] = [];
  #parent_of_thing: number[] = [];

  // debug
  show_debug: boolean = false;

  // "classes"
  HuiThing: typeof HuiThing | PyProxy = HuiThing;

  constructor(
    doc: Document, 
    cvs: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D, 
    create_proxy: (obj: any) => any, 
  ) {
    this.#cvs = cvs;
    this.#ctx = ctx;

    this.#create_proxy = create_proxy;

    this.width = cvs.width;
    this.height = cvs.height;

    this.bg = new HuiLayer(cvs.width, cvs.height);
    this.mg = new HuiLayer(cvs.width, cvs.height);
    this.fg = new HuiLayer(cvs.width, cvs.height);
    this.ui = new HuiLayer(cvs.width, cvs.height);
    this.dbg = new HuiLayer(cvs.width, cvs.height);

    this.physics = new HuiPhysics(this.width, this.height);

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
  add(anything: HuiCursedThing, parent_id?: number) {
    let id = this.#things.length;
    let thing = anything;
    /***
     * To ensure pyodide-compatibility, we have to create out own proxy of the pyodide
     * objects, since it will otherwise be destroyed after the pyodide function terminates
     */
    if (is_py_proxy(thing) && this.#create_proxy) {
      thing = this.#create_proxy(thing);
      this.show_debug && console.log(`<hui> created proxy of ${anything}`);
    }
    thing.__id__ = id;
    if (parent_id !== undefined) {
      this.#parent_of_thing[id] = parent_id;
      if (!this.#children_of_thing[parent_id]) {
        this.#children_of_thing[parent_id] = new Set();
      }
      this.#children_of_thing[parent_id].add(id);
    }
    if (has_method(thing, "tick")) this.#has_tick[id] = true;
    if (has_method(thing, "draw")) this.#has_draw[id] = true;
    if (has_method(thing, "draw_debug")) this.#has_draw_debug[id] = true;
    if (thing instanceof HuiMover) this.#is_physics_body[id] = true;
    this.#things[id] = thing;

    this.show_debug && console.log(`<hui> added ${thing}`)

    call_method_if_it_exists("setup", [], thing);
    
    return thing;
  }

  remove(thing: HuiCursedThing) {
    this.#to_remove[thing.__id__] = true;
  }

  #proxy(anything: Object) {
    let obj = anything;
    if (is_py_proxy(obj) && this.#create_proxy) {
      obj = this.#create_proxy(obj);
      this.show_debug && console.log(`<hui> created persistent proxy of ${anything}`);
    }
    return obj;
  }

  // layers
  add_layer() {
    const new_layer = new HuiLayer(this.width, this.height);
    this.#layers.push(new_layer);
    return new_layer;
  }

  // bodies
  new_mover(x: number, y: number, vx: number = 0, vy: number = 0, ax: number = 0, ay: number = 0) {
    const new_body = new HuiMover(x, y, vx, vy, ax, ay);
    return new_body;
  }

  new_box(x: number, y: number, w: number, h: number) {
    const new_box = new HuiBox(x, y, w, h);
    return new_box;
  }

  new_disc(x: number, y: number, r: number) {
    const new_disc = new HuiDisc(x, y, r);
    return new_disc;
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

  // new timer
  new_timer(duration: number, does_repeat: boolean = false) {
    const new_timer = new HuiTimer(duration, does_repeat, false);
    return new_timer;
  }

  // new random timer
  new_random_timer(period: number, does_repeat: boolean = false) {
    const new_random = new HuiRandomTimer(period, does_repeat, false);
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

  #tick_things(dt: number) {
    this.#has_tick.forEach((value, id) => {
      value && this.#things[id].tick(dt);
    });
  }

  #draw_things(dt: number) {
    this.#has_draw.forEach((value, id) => {
      value && this.#things[id].draw(dt);
    });
  }

  #draw_debug_things(layer: HuiLayer) {
    this.#has_draw_debug.forEach((value, id) => {
      value && this.#things[id].draw_debug(layer, this.mouse);
    });
  }

  #remove_things() {
    this.#to_remove.forEach((value, id) => {
      if (value) {
        this.show_debug && console.log(`<hui> removed: ${this.#things[id]}`);
        this.#remove_from_tree(id);
      }
    });
  }

  #solve_collisions() {
    for (const id_1 in this.#is_physics_body) {
      const body_1 = this.#things[id_1] as HuiMover;
      for (const id_2 in this.#is_physics_body) {
        if (id_2 <= id_1) continue;
        const body_2 = this.#things[id_2] as HuiMover;
        // do stuff
      }
    }
  }

  #remove_from_tree(id: number) {
    // remove from ref list
    delete this.#things[id];
    // rmeove from component lists
    delete this.#has_draw[id];
    delete this.#has_draw_debug[id];
    delete this.#has_tick[id];
    // removing __from__ parent
    const parent = this.#parent_of_thing[id];
    parent !== undefined && this.#children_of_thing[parent]?.delete(id);
    delete this.#parent_of_thing[id];
    // removing children recursively
    if (this.#children_of_thing[id] !== undefined)
    for (let child_id of this.#children_of_thing[id].values()) {
      this.#remove_from_tree(child_id);
    }
    delete this.#children_of_thing[id];
    // remove from remove list
    delete this.#to_remove[id];
  }

  #draw_layers() {
    this.#ctx.clearRect(0, 0, this.#cvs.width, this.#cvs.height);

    for (const layer of this.#all_layers()) {
      this.#ctx.drawImage(layer.cvs, 0, 0);
    }
  }

  prepare() {
    this.setup();
  }

  step(t: number, dt: number) {
    let { 
      __fc__, __ft__, fps, tick_dt, draw_dt, draw_things_dt, draw_layers_dt, key_dt, removal_dt, full_dt 
    } = this.diagnostics;
    // calculate frame times
    __fc__ = Math.min(50, __fc__ + 1);
    __ft__.push(dt);
    __ft__.shift();
    fps = Math.round(__ft__.length / __ft__.reduce((v1, v2) => v1 + v2));
    // set game time
    this.time = t;
    // do timing
    const start_now = performance.now();
    // run tick function and then tick "things"
    this.tick(dt);
    // tick all things
    this.#tick_things(dt);
    // physics step
    this.physics.step(dt);
    // tick time
    const tick_now = performance.now();
    // run draw function and then draw "things"
    this.draw(dt);
    // draw time
    this.dbg.clear();
    const draw_now = performance.now();
    this.#draw_things(dt);
    if (this.show_debug) this.#draw_debug_things(this.dbg);
    // draw things time
    const draw_things_now = performance.now();
    // draw layer stack
    this.#draw_layers();
    // draw things time
    const draw_layers_now = performance.now();
    // update inputs
    this.#update_keymap();
    // key time
    const key_now = performance.now();
    // remove things if marked
    this.#remove_things();
    // draw time
    const removal_now = performance.now();
    // set diagnostics
    tick_dt = reavg(tick_dt, tick_now - start_now, __fc__);
    draw_dt = reavg(draw_dt, draw_now - tick_now, __fc__);
    draw_things_dt = reavg(draw_things_dt, draw_things_now - draw_now, __fc__);
    draw_layers_dt = reavg(draw_layers_dt, draw_layers_now - draw_things_now, __fc__);
    key_dt = reavg(key_dt, key_now - draw_layers_now, __fc__);
    removal_dt = reavg(removal_dt, removal_now - key_now, __fc__);
    full_dt = removal_now - start_now;
    this.diagnostics = {
      fps, __fc__, __ft__, draw_dt, draw_things_dt, draw_layers_dt, full_dt, key_dt, removal_dt, tick_dt
    }
  }

  swap(draw: HuiDrawFunction, setup?: HuiSetupFunction) {
    if (setup) {
      this.setup = this.#proxy(setup) as HuiSetupFunction;
      this.setup(); // call setup again
    }
    this.draw = this.#proxy(draw) as HuiDrawFunction;
  }

  // to be overwritten
  setup: HuiSetupFunction = () => {};
  tick: HuiTickFunction = (dt: number) => {};
  draw: HuiDrawFunction = (dt: number) => {};

  // "static"
  hex = hex;
  rnd = rnd;
  rndi = rndi;
  rndr = rndr;
  clamp = clamp;
  wrap = wrap;
  lerp = lerp;
  sign = sign;
  move_towards = move_towards;

  clear_all = () => {
    for(const layer of this.#all_layers()) {
      layer.clear();
    }
  }
}


