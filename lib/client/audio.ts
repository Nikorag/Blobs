import { getSettings } from "./settings";

/**
 * Sound effects, synthesised with the Web Audio API. There are no audio files, so nothing to
 * download or license and the payload is zero; every sound is a few oscillator notes.
 */
export type Sfx = "tap" | "cardPlay" | "yourTurn" | "trickWin" | "trickLost" | "blob" | "spotOn" | "gameWin";

interface Note {
  /** Seconds after the sound starts. */
  at: number;
  freq: number;
  /** Seconds. */
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** Glide to this frequency over the note. */
  to?: number;
}

export const RECIPES: Record<Sfx, Note[]> = {
  tap: [{ at: 0, freq: 660, dur: 0.04, type: "triangle", gain: 0.12 }],
  cardPlay: [
    { at: 0, freq: 220, to: 90, dur: 0.07, type: "square", gain: 0.09 },
    { at: 0, freq: 1400, to: 500, dur: 0.03, type: "triangle", gain: 0.07 },
  ],
  yourTurn: [
    { at: 0, freq: 784, dur: 0.14, type: "sine", gain: 0.22 },
    { at: 0.14, freq: 1175, dur: 0.22, type: "sine", gain: 0.22 },
  ],
  trickWin: [
    { at: 0, freq: 523, dur: 0.1, type: "triangle", gain: 0.2 },
    { at: 0.09, freq: 659, dur: 0.1, type: "triangle", gain: 0.2 },
    { at: 0.18, freq: 784, dur: 0.22, type: "triangle", gain: 0.2 },
  ],
  trickLost: [{ at: 0, freq: 330, to: 262, dur: 0.16, type: "sine", gain: 0.1 }],
  blob: [
    { at: 0, freq: 330, to: 110, dur: 0.35, type: "sawtooth", gain: 0.14 },
    { at: 0.12, freq: 247, to: 82, dur: 0.35, type: "square", gain: 0.08 },
  ],
  spotOn: [
    { at: 0, freq: 659, dur: 0.09, type: "triangle", gain: 0.2 },
    { at: 0.08, freq: 880, dur: 0.09, type: "triangle", gain: 0.2 },
    { at: 0.16, freq: 1319, dur: 0.24, type: "triangle", gain: 0.2 },
  ],
  gameWin: [
    { at: 0, freq: 523, dur: 0.14, type: "triangle", gain: 0.22 },
    { at: 0.14, freq: 659, dur: 0.14, type: "triangle", gain: 0.22 },
    { at: 0.28, freq: 784, dur: 0.14, type: "triangle", gain: 0.22 },
    { at: 0.42, freq: 1047, dur: 0.5, type: "triangle", gain: 0.24 },
  ],
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/**
 * Browsers, iOS Safari especially, only start audio from a user gesture. Call this on the first
 * tap or key press; sounds requested before then are quietly dropped.
 */
export function unlockAudio(): void {
  const c = context();
  if (c && c.state === "suspended") void c.resume().catch(() => {});
}

export function play(name: Sfx): void {
  if (typeof document === "undefined" || document.hidden) return; // nothing plays in a background tab
  if (!getSettings().sound) return;
  const c = context();
  if (!c || c.state !== "running") return;
  const start = c.currentTime + 0.01;
  for (const n of RECIPES[name]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type ?? "sine";
    const t0 = start + n.at;
    osc.frequency.setValueAtTime(n.freq, t0);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.dur);
    const peak = n.gain ?? 0.15;
    // A fast attack and an exponential fade avoid clicks.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.02);
  }
}
