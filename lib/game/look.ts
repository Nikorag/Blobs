/** How a player's blob is drawn. Picked in the lobby; every field is one of the lists below. */
export const SHAPES = ["jelly", "round", "egg", "bean", "squish"] as const;
export const EYES = ["dots", "wide", "sleepy", "happy", "cyclops", "wink"] as const;
export const MOUTHS = ["smirk", "flat", "o", "smile", "grin", "sad"] as const;
/** Jelly colours lifted from the key art: coral, teal, yellow, purple, then a few extras. */
export const HUES = [10, 172, 46, 268, 200, 330, 100, 28] as const;

export type Shape = (typeof SHAPES)[number];
export type Eyes = (typeof EYES)[number];
export type Mouth = (typeof MOUTHS)[number];

export interface Look {
  shape: Shape;
  eyes: Eyes;
  mouth: Mouth;
  /** Index into HUES. */
  color: number;
}

/** The face a seat gets until its player picks their own. */
export function defaultLook(index: number): Look {
  return { shape: "jelly", eyes: "dots", mouth: MOUTHS[index % 4], color: index % HUES.length };
}

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;

/** Coerce untrusted input into a valid look, filling any gaps from `fallback`. */
export function cleanLook(input: unknown, fallback: Look): Look {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const color = Number.isInteger(raw.color) && (raw.color as number) >= 0 && (raw.color as number) < HUES.length ? (raw.color as number) : fallback.color;
  return {
    shape: oneOf(SHAPES, raw.shape, fallback.shape),
    eyes: oneOf(EYES, raw.eyes, fallback.eyes),
    mouth: oneOf(MOUTHS, raw.mouth, fallback.mouth),
    color,
  };
}
