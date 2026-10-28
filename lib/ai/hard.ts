import { shuffle } from "@/lib/game/cards";
import { applyAction, toView } from "@/lib/game/engine";
import type { Card, Room, RoomView, Suit } from "@/lib/game/types";
import { buildKnowledge, type Knowledge } from "./knowledge";
import { syncMemory } from "./memory";
import { normalMove } from "./policy";
import type { BotInput, BotMove, RoundMemory } from "./types";

type Rng = () => number;

const DEFAULT_BUDGET_MS = 400;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Randomly deal the unseen cards to opponents, respecting the suits they've been shown to lack. */
function determinize(k: Knowledge, rng: Rng): Record<string, Card[]> {
  const pool = shuffle(k.unseen, rng);
  const hands: Record<string, Card[]> = {};
  // Most constrained opponents choose first so the void rules can usually be satisfied.
  const order = [...k.opponents].sort((a, b) => k.voids[b].size - k.voids[a].size);
  for (const j of order) {
    const hand: Card[] = [];
    const rest: Card[] = [];
    for (const c of pool) {
      if (hand.length < k.handSize[j] && !k.voids[j].has(c.suit as Suit)) hand.push(c);
      else rest.push(c);
    }
    // Couldn't honour the constraints (inconsistent sample): top up from whatever is left.
    while (hand.length < k.handSize[j] && rest.length) hand.push(rest.pop()!);
    pool.length = 0;
    pool.push(...rest);
    hands[j] = hand;
  }
  return hands;
}

/** A playable Room matching what the bot knows, with the unseen cards dealt out at random. */
function buildRoom(view: RoomView, hands: Record<string, Card[]>): Room {
  const players = view.players.map((p) => ({
    id: p.id,
    name: p.name,
    ready: true,
    look: p.look,
    hand: p.id === view.you ? view.myHand.map((c) => ({ ...c })) : hands[p.id].map((c) => ({ ...c })),
  }));
  const index = (id: string | null) => players.findIndex((p) => p.id === id);
  return {
    code: "SIM",
    version: 1,
    createdAt: 0,
    hostId: view.hostId,
    phase: view.phase,
    players,
    startingCards: view.totalRounds,
    cardsThisRound: view.cardsThisRound,
    roundNumber: view.roundNumber,
    dealerIdx: index(view.dealerId),
    turnIdx: index(view.turnId),
    trump: view.trump,
    calls: Object.fromEntries(view.players.filter((p) => p.call !== null).map((p) => [p.id, p.call!])),
    tricks: Object.fromEntries(view.players.map((p) => [p.id, p.tricks])),
    trick: view.trick.map((pc) => ({ ...pc })),
    lastTrick: null,
    history: [],
    recapAt: null,
    recapReady: [],
  };
}

/** Play the rest of the round with everyone using the Normal policy. Returns my score. */
function rollout(room: Room, memory: RoundMemory, me: string, rng: Rng): number {
  const mem: RoundMemory = { round: memory.round, tricks: memory.tricks.slice() };
  const ctx = { now: 0, rng };
  while (room.phase === "Call" || room.phase === "Play") {
    const actor = room.players[room.turnIdx];
    const input: BotInput = { view: toView(room, actor.id, 0), memory: mem, difficulty: "normal" };
    const move = normalMove(input, rng);
    applyAction(room, actor.id, move.type === "call" ? { type: "call", value: move.value } : { type: "play", card: move.card }, ctx);
    syncMemory(room, mem);
  }
  const result = room.history[room.history.length - 1];
  return result.calls[me] === result.tricks[me] ? result.calls[me] : -1;
}

/**
 * Hard: sample plausible deals of the hidden cards, play each candidate move out to the end of
 * the round against Normal opponents, and pick the move with the best average score.
 */
export function hardMove(input: BotInput, rng: Rng): BotMove {
  const { view, memory } = input;
  const calling = view.phase === "Call";
  const candidates: BotMove[] = calling
    ? Array.from({ length: view.cardsThisRound + 1 }, (_, value) => value)
        .filter((v) => v !== view.forbiddenCall)
        .map((value) => ({ type: "call" as const, value }))
    : view.playable.map((card) => ({ type: "play" as const, card }));
  if (candidates.length === 1) return candidates[0];

  const k = buildKnowledge(view, memory);
  const totals = new Array<number>(candidates.length).fill(0);
  const deadline = now() + (input.budgetMs ?? DEFAULT_BUDGET_MS);
  let samples = 0;

  do {
    // Same deal for every candidate in a sample, so they're compared like for like.
    const hands = determinize(k, rng);
    candidates.forEach((move, i) => {
      const room = buildRoom(view, hands);
      const mem: RoundMemory = { round: memory.round, tricks: memory.tricks.slice() };
      applyAction(room, view.you, move.type === "call" ? { type: "call", value: move.value } : { type: "play", card: move.card }, { now: 0, rng });
      syncMemory(room, mem);
      totals[i] += rollout(room, mem, view.you, rng);
    });
    samples++;
  } while (now() < deadline && samples < 400);

  let best = 0;
  for (let i = 1; i < totals.length; i++) if (totals[i] > totals[best]) best = i;
  return candidates[best];
}
