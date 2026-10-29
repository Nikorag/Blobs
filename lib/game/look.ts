/** How a player's blob is drawn. Picked in the lobby; every field is one of the lists below. */
export const SHAPES = ["jelly", "round", "egg", "bean", "squish", "gumdrop", "wobble", "pebble", "square"] as const;
export const EYES = ["dots", "wide", "sleepy", "happy", "cyclops", "wink", "heart", "star", "angry", "crossed", "shades"] as const;
export const MOUTHS = ["smirk", "flat", "o", "smile", "grin", "sad", "tongue", "fang", "zigzag", "cat"] as const;
/** Surface finishes layered over (or replacing) the colour. */
export const SKINS = ["plain", "spots", "stripes", "glitter", "galaxy", "gold", "rainbow"] as const;
/** Headwear sitting on top of the blob. */
export const HATS = ["none", "cap", "beanie", "party", "cowboy", "halo", "tophat", "wizard", "crown"] as const;
/** How this player's cards look to everyone at the table. */
export const CARD_STYLES = ["classic", "mint", "candy", "ice", "gold"] as const;
/** Jelly colours lifted from the key art: coral, teal, yellow, purple, then a few extras. */
export const HUES = [10, 172, 46, 268, 200, 330, 100, 28] as const;

export type Shape = (typeof SHAPES)[number];
export type Eyes = (typeof EYES)[number];
export type Mouth = (typeof MOUTHS)[number];
export type Skin = (typeof SKINS)[number];
export type Hat = (typeof HATS)[number];
export type CardStyle = (typeof CARD_STYLES)[number];

export interface Look {
  shape: Shape;
  eyes: Eyes;
  mouth: Mouth;
  skin: Skin;
  hat: Hat;
  cards: CardStyle;
  /** Index into HUES. */
  color: number;
}

const DEFAULT_MOUTHS = ["smirk", "flat", "o", "smile"] as const;

/** The face a seat gets until its player picks their own. */
export function defaultLook(index: number): Look {
  return { shape: "jelly", eyes: "dots", mouth: DEFAULT_MOUTHS[index % 4], skin: "plain", hat: "none", cards: "classic", color: index % HUES.length };
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
    skin: oneOf(SKINS, raw.skin, fallback.skin),
    hat: oneOf(HATS, raw.hat, fallback.hat),
    cards: oneOf(CARD_STYLES, raw.cards, fallback.cards),
    color,
  };
}
