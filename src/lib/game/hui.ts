import { wrapAutocomplete } from "$lib/faux-language-server";
import { vec2, type Vector2 } from "./hui.vectors";

function componentToHex(c: number) {
  const hex = Math.floor(c).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
};

function hex(r: number, g: number, b: number) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

function rnd() {
  return Math.random();
}

function rndr(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function rndi(min: number, max: number) {
  return Math.floor(rndr(min, max));
}

function osc(ctx: AudioContext, type: OscillatorType, frequency: number, duration: number) {
  const o = ctx.createOscillator()
  o.type = type;
  o.frequency.value = frequency;

  const g = ctx.createGain()
  o.connect(g)
  g.connect(ctx.destination)
  o.start(0)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  setTimeout(() => { o.stop(); }, duration * 1000);
}

export class HuiGame {
  doc: Document;
  cvs: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  width: number;
  height: number;

  mouse_x = 0;
  mouse_y = 0;

  keymap: Map<string, [boolean, boolean]> = new Map<string, [boolean, boolean]>();

  // layers
  bg: HuiLayer;
  mg: HuiLayer;
  fg: HuiLayer;
  ui: HuiLayer;

  // sound player
  sound = new HuiSound();

  // timers
  #timers: HuiTimer[] = [];

  constructor(doc: Document, cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.cvs = cvs;
    this.ctx = ctx;
    this.doc = doc;

    this.width = cvs.width;
    this.height = cvs.height;

    this.bg = new HuiLayer(cvs);
    this.mg = new HuiLayer(cvs);
    this.fg = new HuiLayer(cvs);
    this.ui = new HuiLayer(cvs);

    cvs.tabIndex = -1;
    cvs.oncontextmenu = (ev: Event) => ev.preventDefault();

    cvs.onkeydown = (ev: KeyboardEvent) => {
      if (this.keymap.has(ev.key)) {
        this.keymap.set(ev.key, [false, false]);
      } else {
        this.keymap.set(ev.key, [true, false]);
      }
    }

    cvs.onkeyup = (ev: KeyboardEvent) => {
      this.keymap.set(ev.key, [false, true]);
    }

    cvs.onpointerdown = (ev: PointerEvent) => {
      cvs.setPointerCapture(ev.pointerId);

      let key = "m" + ev.button;
      if (this.keymap.has(key)) {
        this.keymap.set(key, [false, false]);
      } else {
        this.keymap.set(key, [true, false]);
      }
    }

    cvs.onpointerup = (ev: PointerEvent) => {
      cvs.releasePointerCapture(ev.pointerId);

      let key = "m" + ev.button;
      this.keymap.set(key, [false, true]);
    }

    doc.onpointermove = (ev: PointerEvent) => {
      this.mouse_x = ev.clientX - cvs.offsetLeft;
      this.mouse_y = ev.clientY - cvs.offsetTop;
    }

    cvs.onblur = (ev: FocusEvent) => {
      this.keymap.clear();
    }
  }

  // input methods
  is_pressed(key: string) {
    return this.keymap.has(key);
  }

  just_pressed(key: string) {
    return this.keymap.get(key)?.[0] || false;
  }

  just_released(key: string) {
    return this.keymap.get(key)?.[1] || false;
  }

  // timers
  add_timer(duration: number, does_repeat: boolean = false) {
    const new_timer = new HuiTimer(duration, does_repeat);
    this.#timers.push(new_timer);
    return new_timer;
  }

  // bodies
  new_body(x: number, y: number, vx: number, vy: number) {
    const new_body = new HuiBody(x, y, vx, vy);
    return new_body;
  }

  #update_keymap() {
    for (const [key, value] of this.keymap.entries()) {
      if (value[1]) {
        this.keymap.delete(key);
        continue;
      }
      if (value[0]) {
        this.keymap.set(key, [false, value[1]]);
      }
    }
  }

  #advance_timers(dt: number) {
    for (const timer of this.#timers) {
      timer.advance(dt);
    }
  }

  #draw_layers() {
    this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
    for (const layer of [this.bg, this.mg, this.fg, this.ui]) {
      this.ctx.drawImage(layer.cvs, 0, 0);
    }
  }

  update(dt: number) {
    this.#update_keymap();
    this.#advance_timers(dt);
    this.#draw_layers();
  }

  // "static"
  hex(r: number, g: number, b: number) { return hex(r, g, b); }
  rnd() { return rnd() };
  rndi(min: number, max: number) { rndi(min, max) };
  rndr(min: number, max: number) { rndr(min, max) };
}

export class HuiSound {
  #ctx = new AudioContext()

  boop(frequency: number, duration: number) {
    osc(this.#ctx, "sine", frequency, duration);
  }

  bleep(frequency: number, duration: number) {
    osc(this.#ctx, "triangle", frequency, duration);
  }

  buzz(frequency: number, duration: number) {
    osc(this.#ctx, "sawtooth", frequency, duration);
  }

  humm(frequency: number, duration: number) {
    osc(this.#ctx, "square", frequency, duration);
  }
}

export class HuiTimer {
  does_repeat: boolean;
  is_running: boolean = false;
  duration: number;
  time: number;

  constructor(duration: number, does_repeat: boolean) {
    this.does_repeat = does_repeat;
    this.duration = duration < 0 ? 0 : duration;
    this.time = 0;
  }

  get progress(): number {
    if (this.duration <= 0) return 0;
    return this.time / this.duration; 
  }

  
  get pingpong(): number {
    return 1 - Math.abs(this.progress * 2 - 1)
  }

  advance(dt: number) {
    if (!this.is_running) return;
    this.time += dt;
    if (this.time > this.duration) {
      if (this.does_repeat) {
        this.time = 0;
      } else {
        this.time = this.duration;
        this.is_running = false;
      }
    }
  }

  start(duration?: number) {
    this.time = 0;
    if (duration !== undefined && duration >= 0) {
      this.duration = duration;
    }
    this.is_running = true;
  }

  pause() {
    this.is_running = false;
  }
}

export class HuiLayer {
  cvs: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;

  constructor(cvs?: HTMLCanvasElement) {
    if (cvs)
      this.cvs = new OffscreenCanvas(cvs.width, cvs.height);
    else
      this.cvs = new OffscreenCanvas(10, 10);
    this.ctx = this.cvs.getContext("2d")!;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
  }

  background (color: string) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
    this.ctx.restore();
  }

  fill(color: string) {
    this.ctx.fillStyle = color;
  }

  stroke(color: string) {
    this.ctx.strokeStyle = color;
  }

  shadow() {
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = "rgb(0, 0, 0, 0.2)";
    this.ctx.shadowOffsetX = 5;
    this.ctx.shadowOffsetY = 5;
  }

  noShadow() {
    this.ctx.shadowColor = "transparent";
  }

  thick(width: number) {
    this.ctx.lineWidth = width;
  }

  circle(x: number, y: number, r: number) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.noShadow();
    this.ctx.stroke();
    this.ctx.restore();
  }

  rect(x: number, y: number, w: number, h: number) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.fill();
    this.noShadow();
    this.ctx.stroke();
    this.ctx.restore();
  }

  ellipse(x: number, y: number, w: number, h: number) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.noShadow();
    this.ctx.stroke();
    this.ctx.restore();
  }
}

export class HuiBody {
  pos: Vector2;
  vel: Vector2;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.pos = vec2(x, y);
    this.vel = vec2(vx, vy);
  }

  // for convenience
  get x(): number { return this.pos.x };
  get y(): number { return this.pos.y };
  get vx(): number { return this.vel.x };
  get vy(): number { return this.vel.y };
  set x(value: number) { this.pos.x = value };
  set y(value: number) { this.pos.y = value };
  set vx(value: number) { this.vel.x = value };
  set vy(value: number) { this.vel.y = value };

  get speed(): number { return this.vel.len() };
  set speed(value: number) { this.vel = this.vel.norm(value)};

  move(dt: number) {
    this.pos = this.pos.add(this.vel.scale(dt));
  }
}