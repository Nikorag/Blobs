import type { Card, PlayedCard, Suit } from "./types";

export const SUITS: Suit[] = ["c", "h", "d", "s"];

export const SUIT_INFO: Record<Suit, { name: string; symbol: string; red: boolean }> = {
  c: { name: "Clubs", symbol: "♣", red: false },
  h: { name: "Hearts", symbol: "♥", red: true },
  d: { name: "Diamonds", symbol: "♦", red: true },
  s: { name: "Spades", symbol: "♠", red: false },
};

/** Display order for sorting a hand: clubs, hearts, diamonds, spades. */
const SUIT_ORDER: Record<Suit, number> = { c: 0, h: 1, d: 2, s: 3 };

export const RANK_LABEL: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

export function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  }
  return deck;
}

/** Fisher-Yates. `rng` returns a float in [0, 1). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sortHand(hand: Card[]): Card[] {
  return hand
    .slice()
    .sort((a, b) =>
      a.suit === b.suit ? b.rank - a.rank : SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit],
    );
}

export interface Deal {
  hands: Card[][];
  trump: Card;
}

export function deal(
  cardsEach: number,
  numberOfPlayers: number,
  rng: () => number = Math.random,
): Deal {
  if (cardsEach * numberOfPlayers + 1 > 52) throw new Error("Not enough cards to deal");
  const deck = shuffle(createDeck(), rng);
  const hands: Card[][] = Array.from({ length: numberOfPlayers }, () => []);
  for (let r = 0; r < cardsEach; r++) {
    for (let p = 0; p < numberOfPlayers; p++) hands[p].push(deck.pop()!);
  }
  return { hands: hands.map(sortHand), trump: deck.pop()! };
}

/** Index into `played` of the winning card: highest trump, otherwise highest of the led suit. */
export function trickWinnerIndex(played: PlayedCard[], trump: Card): number {
  const ledSuit = played[0].card.suit;
  let best = 0;
  for (let i = 1; i < played.length; i++) {
    const a = played[i].card;
    const b = played[best].card;
    const aTrump = a.suit === trump.suit;
    const bTrump = b.suit === trump.suit;
    if (aTrump && !bTrump) best = i;
    else if (aTrump === bTrump && a.suit === b.suit && a.rank > b.rank) best = i;
    else if (!aTrump && !bTrump && b.suit !== ledSuit && a.suit === ledSuit) best = i;
  }
  return best;
}

/** Cards that may legally be played: you must follow suit if you can. */
export function legalPlays(hand: Card[], trick: PlayedCard[]): Card[] {
  if (trick.length === 0) return hand;
  const led = trick[0].card.suit;
  const following = hand.filter((c) => c.suit === led);
  return following.length > 0 ? following : hand;
}
