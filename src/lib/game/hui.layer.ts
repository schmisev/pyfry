import { HuiImage } from "./hui.image";

export class HuiLayer {
  cvs: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;

  constructor(w: number, h: number) {
    this.cvs = new OffscreenCanvas(w, h);
    this.ctx = this.cvs.getContext("2d")!;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
  }

  save() {
    this.ctx.save();
  }

  restore() {
    this.ctx.restore();
  }

  rotate(radians: number) {
    this.ctx.rotate(radians);
  }

  scale(fx: number, fy: number) {
    this.ctx.scale(fx, fy);
  }

  move(dx: number, dy: number) {
    this.ctx.translate(dx, dy);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
  }

  flood(color: string) {
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

  no_stroke() {
    this.ctx.strokeStyle = "transparent";
  }

  shadow() {
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = "rgb(0, 0, 0, 0.2)";
    this.ctx.shadowOffsetX = 5;
    this.ctx.shadowOffsetY = 5;
  }

  no_shadow() {
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
    this.no_shadow();
    this.ctx.stroke();
    this.ctx.restore();
  }

  rect(x: number, y: number, w: number, h: number) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.fill();
    this.no_shadow();
    this.ctx.stroke();
    this.ctx.restore();
  }

  ellipse(x: number, y: number, w: number, h: number) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.no_shadow();
    this.ctx.stroke();
    this.ctx.restore();
  }

  text(text: string, x: number, y: number) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.fillText(text, x, y);
    this.ctx.strokeText(text, x, y);
    this.ctx.restore();
  }

  text_align(alignment: CanvasTextAlign) {
    this.ctx.textAlign = alignment;
  }

  text_baseline(baseline: CanvasTextBaseline) {
    this.ctx.textBaseline = baseline;
  }

  text_size(size: number) {
    this.ctx.font = `${size}px ${this.ctx.font.split(" ")[1]}`;
  }

  font(font: string) {
    this.ctx.font = `${this.ctx.font.split(" ")[0]} ${font}`;
  }

  show(sprite: HuiSprite | HuiImage, x: number, y: number, w?: number, h?: number) {
    let src: OffscreenCanvas | HTMLImageElement;
    if (sprite instanceof HuiImage) {
      src = sprite.img;
    } else {
      // sprite
      src = sprite.cvs;
    }

    let draw_w = (w ? w : src.width);
    let draw_h = (h ? h : src.height)
    let draw_x = sprite.centered ?  x - draw_w / 2 : x;
    let draw_y = sprite.centered ?  y - draw_h / 2 : y;

    this.ctx.save()
    this.ctx.drawImage(src, draw_x, draw_y, draw_w, draw_h);
    this.ctx.restore()
  }
}

export class HuiSprite extends HuiLayer {
  centered: boolean;

  constructor(w: number, h: number, centered = true) {
    super(w, h);
    this.centered = centered;
    
    if (centered) {
      this.ctx.translate(w / 2, h / 2);
    }
  }
}