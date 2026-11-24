import { chooseMove, newMemory, syncMemory } from "@/lib/ai";
import { applyAction, AWAY_AFTER_MISSES, GameError, toView, TURN_TIMEOUT_MS } from "@/lib/game/engine";
import type { Difficulty, Room } from "@/lib/game/types";

/** Hard thinks for this long per move; the server has no worker to hide it in. */
const BOT_BUDGET_MS = 250;

/** Least time the server leaves between a move and the next computer move, however many clients ask. */
export const BOT_MIN_GAP_MS = 500;
/** Extra time a finished trick stays on the table before the next computer player acts. */
export const BOT_TRICK_PAUSE_MS = 1500;

/**
 * Keep the computer players' memory of the round current. Call after every change to the room.
 * Humans' seats can be played by the server too (see nudgeTurn), so every table keeps it.
 */
export function syncBotMemory(room: Room): void {
  syncMemory(room, (room.botMemory ??= newMemory(room.roundNumber)));
}

/**
 * Let the computer player whose turn it is take it. Any human at the table may ask (so the game
 * doesn't hang on one phone staying awake) and several may at once: the server enforces the pacing,
 * so a request that arrives too early, or after someone else already moved, does nothing.
 */
export function playBotTurn(room: Room, callerId: string, now: number): void {
  if (!room.players.some((p) => p.id === callerId && !p.bot)) throw new GameError("Only a human at the table can run the computer players");
  if (room.phase !== "Call" && room.phase !== "Play") return;
  const actor = room.players[room.turnIdx];
  const level = actor ? seatLevel(room, actor.id) : null;
  if (!actor || !level) return;
  const afterTrick = room.phase === "Play" && room.trick.length === 0 && room.lastTrick !== null;
  if (now < (room.moveAt ?? 0) + BOT_MIN_GAP_MS + (afterTrick ? BOT_TRICK_PAUSE_MS : 0)) return;
  syncBotMemory(room);
  const move = chooseMove({
    view: toView(room, actor.id, now),
    memory: structuredClone(room.botMemory!),
    difficulty: level,
    budgetMs: BOT_BUDGET_MS,
  });
  applyAction(room, actor.id, move.type === "call" ? { type: "call", value: move.value } : { type: "play", card: move.card }, { now, rng: Math.random });
  syncBotMemory(room);
}

/** How the server plays this seat, or null if a human is in charge of it. */
function seatLevel(room: Room, playerId: string): Difficulty | null {
  const player = room.players.find((p) => p.id === playerId);
  if (player?.bot) return player.bot;
  return room.away?.includes(playerId) ? "normal" : null;
}

/**
 * Skip a human who has sat on their turn past the deadline: the server plays a Normal-level, always
 * legal move for them. Too early, or not their turn any more, does nothing. Repeated misses hand the
 * seat to the server until they return.
 */
export function nudgeTurn(room: Room, callerId: string, now: number): void {
  if (!room.players.some((p) => p.id === callerId && !p.bot)) throw new GameError("Only a human at the table can do that");
  if (room.phase !== "Call" && room.phase !== "Play") return;
  const actor = room.players[room.turnIdx];
  if (!actor || actor.id === callerId || actor.bot || seatLevel(room, actor.id)) return;
  if (now < (room.moveAt ?? 0) + TURN_TIMEOUT_MS) return;
  syncBotMemory(room);
  const move = chooseMove({ view: toView(room, actor.id, now), memory: structuredClone(room.botMemory!), difficulty: "normal", budgetMs: BOT_BUDGET_MS });
  applyAction(room, actor.id, move.type === "call" ? { type: "call", value: move.value } : { type: "play", card: move.card }, { now, rng: Math.random });
  const missed = ((room.missed ??= {})[actor.id] ?? 0) + 1;
  room.missed[actor.id] = missed;
  if (missed >= AWAY_AFTER_MISSES && !room.away?.includes(actor.id)) (room.away ??= []).push(actor.id);
  syncBotMemory(room);
}

/** A human acted (or came back): their seat is theirs again and the miss count starts over. */
export function claimSeat(room: Room, playerId: string): void {
  if (room.missed?.[playerId]) room.missed[playerId] = 0;
  if (room.away?.includes(playerId)) room.away = room.away.filter((id) => id !== playerId);
}
