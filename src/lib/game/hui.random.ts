import { HuiTimer } from "./hui.timer";
import { lerp, rndi, rndr } from "./hui.utils";
import { HuiVector, vec2 } from "./hui.vector";


export class HuiRandomTimer extends HuiTimer {
  expected_duration: number;

  current: number;
  last: number;

  get current_axis() {
    return 2 * this.current - 1;
  }

  get current_pingpong() {
    return 1 - Math.abs(this.current_axis);
  }

  get current_dir() {
    return vec2(1, 0).rotate(Math.PI * 2 * this.current);
  }

  get between() {
    return lerp(this.last, this.current, this.progress);
  }

  get between_axis() {
    return 2 * this.between - 1;
  }

  get between_pingpong() {
    return 1 - Math.abs(this.between_axis);
  }

  get between_dir() {
    return vec2(1, 0).rotate(Math.PI * 2 * this.between);
  }

  constructor(duration: number, does_repeat: boolean, autoremove: boolean) {
    super(duration, does_repeat, autoremove);
    this.expected_duration = duration;

    this.current = 0;
    this.last = 0;

    this.reroll();
  }

  reroll() {
    this.time = 0;
    this.duration = this.expected_duration + rndr(-this.expected_duration, this.expected_duration);

    this.last = this.current;
    this.current = rndr(0, 1);
  }

  tick(dt: number) {
    this.just_finished = false;
    this.just_started = false;

    if (!this.is_running) return;
    this.time += dt;
    if (this.time > this.duration) {
      this.just_finished = true
      this.reroll();
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
}