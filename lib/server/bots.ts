import { chooseMove, newMemory, syncMemory } from "@/lib/ai";
import { applyAction, GameError, toView } from "@/lib/game/engine";
import type { Room } from "@/lib/game/types";

/** Hard thinks for this long per move; the server has no worker to hide it in. */
const BOT_BUDGET_MS = 250;

/** Least time the server leaves between a move and the next computer move, however many clients ask. */
export const BOT_MIN_GAP_MS = 500;
/** Extra time a finished trick stays on the table before the next computer player acts. */
export const BOT_TRICK_PAUSE_MS = 1500;

/** Keep the computer players' memory of the round current. Call after every change to the room. */
export function syncBotMemory(room: Room): void {
  if (!room.players.some((p) => p.bot)) return;
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
  if (!actor?.bot) return;
  const afterTrick = room.phase === "Play" && room.trick.length === 0 && room.lastTrick !== null;
  if (now < (room.moveAt ?? 0) + BOT_MIN_GAP_MS + (afterTrick ? BOT_TRICK_PAUSE_MS : 0)) return;
  syncBotMemory(room);
  const move = chooseMove({
    view: toView(room, actor.id, now),
    memory: structuredClone(room.botMemory!),
    difficulty: actor.bot,
    budgetMs: BOT_BUDGET_MS,
  });
  applyAction(room, actor.id, move.type === "call" ? { type: "call", value: move.value } : { type: "play", card: move.card }, { now, rng: Math.random });
  syncBotMemory(room);
}
