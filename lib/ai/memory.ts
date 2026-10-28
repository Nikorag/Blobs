import type { Room } from "@/lib/game/types";
import type { RoundMemory } from "./types";

export function newMemory(round = 0): RoundMemory {
  return { round, tricks: [] };
}

/**
 * Bring the public memory up to date with the room. Call after every action: tricks are
 * only remembered here, because the engine itself only keeps the most recent one.
 */
export function syncMemory(room: Room, memory: RoundMemory): void {
  if (memory.round !== room.roundNumber) {
    memory.round = room.roundNumber;
    memory.tricks = [];
  }
  const completed = Object.values(room.tricks).reduce((a, b) => a + b, 0);
  if (room.lastTrick && memory.tricks.length < completed) memory.tricks.push(room.lastTrick.cards);
}
