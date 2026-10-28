import { chooseMove, newMemory, syncMemory } from "@/lib/ai";
import { applyAction, GameError, toView } from "@/lib/game/engine";
import type { Room } from "@/lib/game/types";

/** Hard thinks for this long per move; the server has no worker to hide it in. */
const BOT_BUDGET_MS = 250;

/** Keep the computer players' memory of the round current. Call after every change to the room. */
export function syncBotMemory(room: Room): void {
  if (!room.players.some((p) => p.bot)) return;
  syncMemory(room, (room.botMemory ??= newMemory(room.roundNumber)));
}

/**
 * Let the computer player whose turn it is take it. Only the host's client asks, on a timer, so the
 * table keeps a natural pace. Asking when it isn't a computer's turn does nothing.
 */
export function playBotTurn(room: Room, callerId: string, now: number): void {
  if (room.hostId !== callerId) throw new GameError("Only the host can run the computer players");
  if (room.phase !== "Call" && room.phase !== "Play") return;
  const actor = room.players[room.turnIdx];
  if (!actor?.bot) return;
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
