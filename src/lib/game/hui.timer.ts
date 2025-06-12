import { HuiThing } from "./hui.thing";

export class HuiTimer extends HuiThing {
  autoremove: boolean;
  does_repeat: boolean;
  is_running: boolean = false;
  just_started: boolean = false;
  just_finished: boolean = false;
  duration: number;
  time: number;

  constructor(duration: number, does_repeat: boolean, autoremove: boolean) {
    super();
    this.autoremove = autoremove;
    this.does_repeat = does_repeat;
    this.duration = duration < 0 ? 0 : duration;
    this.time = 0;
  }

  get progress(): number {
    if (this.duration <= 0) return 0;
    return this.time / this.duration;
  }

  get axis(): number {
    return 2 * this.progress - 1;
  }

  get pingpong(): number {
    return 1 - Math.abs(this.axis);
  }

  tick(dt: number) {
    this.just_finished = false;
    this.just_started = false;

    if (!this.is_running) return;
    this.time += dt;
    if (this.time > this.duration) {
      this.just_finished = true
      if (this.does_repeat) {
        this.just_started = true;
        this.time = 0;
      } else {
        this.time = this.duration;
        this.is_running = false;
        if (this.autoremove) this._remove_ = true;
      }
    }
  }

  start(duration?: number, does_repeat?: boolean) {
    this.time = 0;
    if (duration !== undefined && duration >= 0) {
      this.duration = duration;
      if (does_repeat !== undefined) {
        this.does_repeat = does_repeat;
      }
    }
    this.is_running = true;
    this.just_started = true;
  }

  pause() {
    this.is_running = false;
  }

  stop() {
    this.just_finished = true;
    this.time = this.duration;
    this.is_running = false;
  }

  toString() {
    return `<hui:timer t=${this.time} p=${this.progress} t=${this.duration}>`
  }
}
