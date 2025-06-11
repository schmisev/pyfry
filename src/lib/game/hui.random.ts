import { HuiThing } from "./hui.thing";
import { rndi, rndr } from "./hui.utils";


export class HuiRandom extends HuiThing {
  period: number;
  current_period: number;
  #time: number = 0;

  target_a: number = 0;
  target_b: number = 0;
  
  constructor(period: number) {
    super();
    this.period = period;
    this.current_period = period;

    this.reroll();
  }

  get progress() {
    return this.#time / this.current_period;
  }

  reroll() {
    this.#time = 0;
    this.current_period = this.period + rndr(-this.period, this.period);

    this.target_a = rndr(-1, 1);
    this.target_b = rndi(-1, 1);
  }

  tick(dt: number) {
    console.log("ticked")
    this.#time += dt;
    if (this.#time > this.current_period) {
      this.reroll();
    }
  }
}