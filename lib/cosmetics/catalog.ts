import { CARD_STYLES, type CardStyle, type Look } from "@/lib/game/look";

export { CARD_STYLES, type CardStyle };

export const SLOTS = ["shape", "eyes", "mouth", "skin", "hat", "cards"] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABEL: Record<Slot, string> = {
  shape: "Shapes",
  eyes: "Eyes",
  mouth: "Mouths",
  skin: "Skins",
  hat: "Hats",
  cards: "Cards",
};

/** Coin price of each paid item. Anything not listed here is free from the start. */
const PRICES: Record<Slot, Record<string, number>> = {
  shape: { bean: 60, squish: 60, gumdrop: 80, wobble: 80, pebble: 100, square: 100 },
  eyes: { cyclops: 50, wink: 50, heart: 90, star: 90, angry: 70, crossed: 70, shades: 120 },
  mouth: { grin: 50, sad: 50, tongue: 70, fang: 80, zigzag: 80, cat: 100 },
  skin: { spots: 100, stripes: 100, glitter: 150, galaxy: 200, gold: 250, rainbow: 250 },
  hat: { cap: 80, beanie: 80, party: 90, cowboy: 120, halo: 150, tophat: 150, wizard: 180, crown: 300 },
  cards: { mint: 120, candy: 120, ice: 160, gold: 300 },
};

export const price = (slot: Slot, id: string): number => PRICES[slot][id] ?? 0;
export const itemKey = (slot: Slot, id: string): string => `${slot}:${id}`;

export function isOwned(owned: ReadonlySet<string>, slot: Slot, id: string): boolean {
  return price(slot, id) === 0 || owned.has(itemKey(slot, id));
}

const LOOK_SLOTS = ["shape", "eyes", "mouth", "skin", "hat", "cards"] as const;

/** Every part of `look` the player hasn't unlocked. */
export function lockedParts(look: Look, owns: (slot: Slot, id: string) => boolean): Slot[] {
  return LOOK_SLOTS.filter((slot) => !owns(slot, look[slot]));
}
