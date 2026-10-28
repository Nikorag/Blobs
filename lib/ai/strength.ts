import { trickWinnerIndex } from "@/lib/game/cards";
import type { Card, Suit } from "@/lib/game/types";
import type { Knowledge } from "./knowledge";

/** An opponent who can beat us will usually, but not always, play the card that does it. */
const WILLINGNESS = 0.9;

const countAbove = (ranks: number[], rank: number) => ranks.reduce((n, r) => (r > rank ? n + 1 : n), 0);

/** Unseen cards that opponent `j` could possibly hold (those not in a suit they're known to lack). */
function candidatePool(k: Knowledge, j: string): number {
  let n = k.unseen.length;
  for (const s of k.voids[j]) n -= k.unseenRanks[s].length;
  return Math.max(1, n);
}

/** Chance opponent `j` is out of suit `s`. Certain if they've already shown it. */
function pVoid(k: Knowledge, j: string, s: Suit): number {
  if (k.voids[j].has(s)) return 1;
  const inSuit = k.unseenRanks[s].length;
  const pool = candidatePool(k, j);
  const ratio = Math.max(0, (pool - inSuit) / pool);
  return Math.pow(ratio, k.handSize[j]);
}

/** Chance opponent `j` holds at least one of `count` specific unseen cards, none of them in a suit they lack. */
function pHoldsAny(k: Knowledge, j: string, suit: Suit, count: number): number {
  if (count === 0 || k.voids[j].has(suit)) return 0;
  const p = Math.min(1, k.handSize[j] / candidatePool(k, j));
  return 1 - Math.pow(1 - p, count);
}

/**
 * Chance that `card` wins the trick if played now. With nothing on the table the card leads;
 * otherwise it must also beat what's already there. Opponents who've yet to play try to beat it
 * with higher cards of the led suit, or by trumping if they're out of that suit.
 */
export function winProbability(card: Card, k: Knowledge): number {
  const led = k.trick.length > 0 ? k.trick[0].card.suit : card.suit;
  if (k.trick.length > 0) {
    const asPlayed = [...k.trick, { card, playerId: k.me }];
    const trumpCard = { rank: 0, suit: k.trump };
    if (trickWinnerIndex(asPlayed, trumpCard) !== asPlayed.length - 1) return 0;
  }
  const isTrump = card.suit === k.trump;
  const higherTrumps = countAbove(k.unseenRanks[k.trump], isTrump ? card.rank : 0);
  const higherInLed = isTrump ? 0 : countAbove(k.unseenRanks[led], card.rank);

  let p = 1;
  for (const j of k.yetToPlay) {
    let beat: number;
    if (isTrump) {
      // Only a higher trump beats a trump; off-suit opponents may only use one if they're void.
      const canTrump = led === k.trump ? 1 : pVoid(k, j, led);
      beat = canTrump * pHoldsAny(k, j, k.trump, higherTrumps);
    } else {
      const follow = pHoldsAny(k, j, led, higherInLed);
      const trumpIn = pVoid(k, j, led) * pHoldsAny(k, j, k.trump, higherTrumps);
      beat = 1 - (1 - follow) * (1 - trumpIn);
    }
    p *= 1 - WILLINGNESS * beat;
  }
  return p;
}

/** Distribution of the number of successes from independent trials with the given probabilities. */
export function poissonBinomial(ps: number[]): number[] {
  let dist = [1];
  for (const p of ps) {
    const next = new Array<number>(dist.length + 1).fill(0);
    for (let i = 0; i < dist.length; i++) {
      next[i] += dist[i] * (1 - p);
      next[i + 1] += dist[i] * p;
    }
    dist = next;
  }
  return dist;
}
