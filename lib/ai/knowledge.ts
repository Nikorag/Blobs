import { createDeck } from "@/lib/game/cards";
import type { Card, PlayedCard, RoomView, Suit } from "@/lib/game/types";
import type { RoundMemory } from "./types";

/** What a player can deduce from the public record plus their own hand. */
export interface Knowledge {
  me: string;
  trump: Suit;
  hand: Card[];
  trick: PlayedCard[];
  /** Cards that are neither mine, nor played, nor the turned-up trump: in an opponent's hand or never dealt. */
  unseen: Card[];
  /** Number of unseen cards per suit and their ranks, for fast "how many are higher" queries. */
  unseenRanks: Record<Suit, number[]>;
  voids: Record<string, Set<Suit>>;
  handSize: Record<string, number>;
  /** Opponents who have yet to play in the current trick. */
  yetToPlay: string[];
  opponents: string[];
}

const SUITS: Suit[] = ["c", "h", "d", "s"];

export function buildKnowledge(view: RoomView, memory: RoundMemory): Knowledge {
  const seen = new Set<string>();
  const mark = (c: Card) => seen.add(`${c.rank}${c.suit}`);
  view.myHand.forEach(mark);
  if (view.trump) mark(view.trump);
  memory.tricks.forEach((t) => t.forEach((pc) => mark(pc.card)));
  view.trick.forEach((pc) => mark(pc.card));

  const unseen = createDeck().filter((c) => !seen.has(`${c.rank}${c.suit}`));
  const unseenRanks: Record<Suit, number[]> = { c: [], h: [], d: [], s: [] };
  unseen.forEach((c) => unseenRanks[c.suit].push(c.rank));

  // Anyone who failed to follow suit is out of that suit for the rest of the round.
  const voids: Record<string, Set<Suit>> = {};
  const handSize: Record<string, number> = {};
  for (const p of view.players) {
    voids[p.id] = new Set();
    handSize[p.id] = p.handCount;
  }
  const tricks = view.trick.length > 0 ? [...memory.tricks, view.trick] : memory.tricks;
  for (const trick of tricks) {
    const led = trick[0].card.suit;
    for (const pc of trick.slice(1)) if (pc.card.suit !== led) voids[pc.playerId]?.add(led);
  }

  const played = new Set(view.trick.map((pc) => pc.playerId));
  const opponents = view.players.filter((p) => p.id !== view.you).map((p) => p.id);
  return {
    me: view.you,
    trump: view.trump!.suit,
    hand: view.myHand,
    trick: view.trick,
    unseen,
    unseenRanks,
    voids,
    handSize,
    yetToPlay: opponents.filter((id) => !played.has(id)),
    opponents,
  };
}

/** The same knowledge as it will stand when the next trick is led (everyone has one fewer card). */
export function atNextLead(k: Knowledge): Knowledge {
  const handSize = { ...k.handSize };
  for (const id of k.yetToPlay) handSize[id] = Math.max(0, handSize[id] - 1);
  return { ...k, trick: [], handSize, yetToPlay: k.opponents };
}

export { SUITS };
