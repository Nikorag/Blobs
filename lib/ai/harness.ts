import { applyAction, createRoom, joinRoom, scoreFor, toView } from "@/lib/game/engine";
import type { Difficulty, Room } from "@/lib/game/types";
import { chooseMove, newMemory, syncMemory } from "./index";

/** Seeded RNG so games are reproducible. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Play a whole game between bots. Seat i uses levels[i]. Throws if any bot makes an illegal move. */
export function playBotGame(levels: Difficulty[], rng: () => number, hardBudgetMs = 15) {
  const room: Room = createRoom("SIM1", "p0", "P0", 0);
  for (let i = 1; i < levels.length; i++) joinRoom(room, `p${i}`, `P${i}`);
  room.players.forEach((p) => (p.ready = true));
  const ctx = { now: 0, rng };
  applyAction(room, "p0", { type: "start" }, ctx);
  const memory = newMemory(room.roundNumber);
  const level = (id: string) => levels[Number(id.slice(1))];

  let guard = 0;
  while (room.phase !== "End") {
    if (guard++ > 2000) throw new Error("game did not finish");
    if (room.phase === "Recap") {
      applyAction(room, "p0", { type: "advance" }, { now: 1e12, rng });
      syncMemory(room, memory);
      continue;
    }
    const actor = room.players[room.turnIdx];
    const move = chooseMove(
      { view: toView(room, actor.id, 0), memory, difficulty: level(actor.id), budgetMs: hardBudgetMs },
      rng,
    );
    applyAction(room, actor.id, move.type === "call" ? { type: "call", value: move.value } : { type: "play", card: move.card }, ctx);
    syncMemory(room, memory);
  }

  const scores = room.players.map((p) => room.history.reduce((s, r) => s + scoreFor(r, p.id), 0));
  const hits = room.players.map((p) => room.history.filter((r) => r.calls[p.id] === r.tricks[p.id]).length);
  return { scores, hits, rounds: room.history.length };
}
