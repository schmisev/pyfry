export class HuiImage {
  img: HTMLImageElement;
  centered: boolean;

  constructor(src: string, centered: boolean = true) {
    this.img = new Image();
    this.img.src = src;

    this.centered = centered;
  }

  set width(w: number) {
    this.img.width = w;
  }

  set height(h: number) {
    this.img.height = h;
  }

  get width() {
    return this.img.width;
  }

  get height() {
    return this.img.height;
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
}