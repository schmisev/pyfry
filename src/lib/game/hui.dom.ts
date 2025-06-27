import { HuiThing } from "./hui.thing";

export abstract class HuiDOMElement extends HuiThing {

}

export class HuiButton extends HuiDOMElement {
  #el: HTMLButtonElement;
  #cvs: HTMLCanvasElement;

  is_pressed: boolean = false;
  just_pressed: boolean = false;
  just_released: boolean = false;

  constructor(doc: Document, cvs: HTMLCanvasElement, txt: string, x: number, y: number, w: number, h: number) {
    super();

    this.#cvs = cvs;
    this.#el = doc.createElement("button") as HTMLButtonElement;
    this.#el.onpointerdown = () => {
      this.is_pressed = true;
      this.just_pressed = true;
    }
    this.#el.onpointerup = () => {
      this.is_pressed = false;
      this.just_released = true;
    }
    
    this.#el.innerHTML = txt;
    this.#el.style.position = "absolute";
    this.#el.style.top = y + "px";
    this.#el.style.left = x + "px"; 
    this.#el.style.width = w + "px";
    this.#el.style.height = h + "px";
    this.#el.style.zIndex = "300";
  }

  setup() {
    this.#cvs.parentElement!.appendChild(this.#el);
  }

  update() {
    this.just_pressed = false;
    this.just_released = false;
  }

  remove() {
    this.#el.remove();
  }
}