import { trickWinnerIndex } from "@/lib/game/cards";
import type { Card } from "@/lib/game/types";
import { atNextLead, buildKnowledge } from "./knowledge";
import { poissonBinomial, winProbability } from "./strength";
import type { BotInput, BotMove } from "./types";

type Rng = () => number;

const sameCard = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;

function me(input: BotInput) {
  return input.view.players.find((p) => p.id === input.view.you)!;
}

/** Nearest legal call to `target` (the dealer may be barred from one value). */
function nearestAllowed(target: number, max: number, forbidden: number | null): number {
  const clamped = Math.max(0, Math.min(max, Math.round(target)));
  if (clamped !== forbidden) return clamped;
  const candidates = [clamped - 1, clamped + 1].filter((c) => c >= 0 && c <= max);
  return candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
}

function gaussian(rng: Rng): number {
  return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
}

/* ---------------------------------------------------------------- Easy */

/** A rough high-card count, like a casual player's gut feel. */
function roughTricks(hand: Card[], trump: string): number {
  return hand.reduce((sum, c) => {
    if (c.suit === trump) return sum + (c.rank >= 13 ? 0.9 : c.rank >= 10 ? 0.6 : c.rank >= 7 ? 0.35 : 0.15);
    return sum + (c.rank === 14 ? 0.75 : c.rank === 13 ? 0.35 : c.rank === 12 ? 0.15 : 0.03);
  }, 0);
}

function easyCall(input: BotInput, rng: Rng): number {
  const { view } = input;
  const guess = roughTricks(view.myHand, view.trump!.suit) + gaussian(rng) * 1.0;
  return nearestAllowed(guess, view.cardsThisRound, view.forbiddenCall);
}

function easyCard(input: BotInput, rng: Rng): Card {
  const { view } = input;
  const legal = view.playable;
  const player = me(input);
  const need = (player.call ?? 0) - player.tricks;
  const byRank = [...legal].sort((a, b) => a.rank - b.rank);
  const lowest = byRank[0];
  const highest = byRank[byRank.length - 1];
  // Easy players lose the thread now and then and just throw a card.
  if (rng() < 0.25) return legal[Math.floor(rng() * legal.length)];
  const wantWin = need > 0 && rng() < Math.min(1, need / view.myHand.length + 0.15);
  const trump = view.trump!;

  if (view.trick.length === 0) return wantWin ? highest : lowest;

  const beats = (c: Card) => {
    const played = [...view.trick, { card: c, playerId: view.you }];
    return trickWinnerIndex(played, trump) === played.length - 1;
  };
  if (wantWin) return byRank.find(beats) ?? lowest;
  return [...byRank].reverse().find((c) => !beats(c)) ?? lowest;
}

/* -------------------------------------------------------------- Normal */

/** Win probability of each card in hand if it were led in a future trick. */
function futureStrengths(input: BotInput) {
  const k = buildKnowledge(input.view, input.memory);
  const next = atNextLead(k);
  return { k, strengths: k.hand.map((c) => winProbability(c, next)) };
}

/** Call whichever number of tricks is most likely to be hit exactly. */
function normalCall(input: BotInput): number {
  const { view } = input;
  const { strengths } = futureStrengths(input);
  const dist = poissonBinomial(strengths);
  let best = -1;
  let bestP = -1;
  for (let c = 0; c < dist.length; c++) {
    if (c === view.forbiddenCall) continue;
    if (dist[c] > bestP) {
      best = c;
      bestP = dist[c];
    }
  }
  return best;
}

/**
 * One-step lookahead: for each legal card, how likely is it to win this trick, and given that,
 * how likely are the remaining cards to land me exactly on my call?
 */
function normalCard(input: BotInput, rng: Rng): Card {
  const { view } = input;
  const legal = view.playable;
  if (legal.length === 1) return legal[0];

  const player = me(input);
  const need = (player.call ?? 0) - player.tricks;
  const { k, strengths } = futureStrengths(input);

  let best = legal[0];
  let bestScore = -Infinity;
  for (const card of legal) {
    const pWin = winProbability(card, k);
    const rest = strengths.filter((_, i) => !sameCard(k.hand[i], card));
    const dist = poissonBinomial(rest);
    const at = (n: number) => (n >= 0 && n < dist.length ? dist[n] : 0);
    let score = pWin * at(need - 1) + (1 - pWin) * at(need);
    // If the call is already lost, just avoid giving other players tricks they need: play low.
    if (need < 0) score = -pWin;
    // Prefer to spend the weaker card when the outcome is otherwise the same.
    score -= card.rank * 1e-6 + rng() * 1e-9;
    if (score > bestScore) {
      best = card;
      bestScore = score;
    }
  }
  return best;
}

/** The standard policy, also used inside Hard's simulations. */
export function normalMove(input: BotInput, rng: Rng): BotMove {
  if (input.view.phase === "Call") return { type: "call", value: normalCall(input) };
  return { type: "play", card: normalCard(input, rng) };
}

export function easyMove(input: BotInput, rng: Rng): BotMove {
  if (input.view.phase === "Call") return { type: "call", value: easyCall(input, rng) };
  return { type: "play", card: easyCard(input, rng) };
}
