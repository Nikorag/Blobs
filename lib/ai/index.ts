import { hardMove } from "./hard";
import { easyMove, normalMove } from "./policy";
import type { BotInput, BotMove } from "./types";

export type { BotInput, BotMove, Difficulty, RoundMemory } from "./types";
export { newMemory, syncMemory } from "./memory";

/** Choose a move synchronously. Hard blocks for up to its budget, so run it in the worker in the UI. */
export function chooseMove(input: BotInput, rng: () => number = Math.random): BotMove {
  switch (input.difficulty) {
    case "easy":
      return easyMove(input, rng);
    case "normal":
      return normalMove(input, rng);
    case "hard":
      return hardMove(input, rng);
  }
}
