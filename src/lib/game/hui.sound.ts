import { rndr } from "./hui.utils";

export function osc(ctx: AudioContext, type: OscillatorType, frequency: number, duration: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = frequency;

  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);

  o.start(0);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  setTimeout(() => { o.stop(); }, duration * 1000);
}

export function noise(ctx: AudioContext, frequency: number, duration: number) {
  const buffer_size = ctx.sampleRate;
  const noise_buffer = ctx.createBuffer(2, buffer_size, buffer_size);

  for (let channel = 0; channel < noise_buffer.numberOfChannels; channel++) {
      const output = noise_buffer.getChannelData(channel);
      for (let i = 0; i < buffer_size; i++) {
          output[i] = rndr(-1, 1);
      }
  }

  const s = ctx.createBufferSource();
  s.buffer = noise_buffer;
  s.loop = true;

  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setTargetAtTime(frequency, ctx.currentTime, 0);

  const g = ctx.createGain();
  
  s.connect(f);
  f.connect(g);
  g.connect(ctx.destination);

  s.start(0);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  setTimeout(() => { s.stop(); }, duration * 1000);
}

export class HuiSound {
  #ctx = new AudioContext();

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

  psh(frequency: number, duration: number) {
    noise(this.#ctx, frequency, duration);
  }
}
