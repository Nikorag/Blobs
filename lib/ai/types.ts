import type { Card, Difficulty, PlayedCard, RoomView } from "@/lib/game/types";

export type { Difficulty };

/** Public record of the round so far: every completed trick, which any human could also have tracked. */
export interface RoundMemory {
  round: number;
  tricks: PlayedCard[][];
}

/** Everything a bot is allowed to know: its own view plus the public memory of the round. */
export interface BotInput {
  view: RoomView;
  memory: RoundMemory;
  difficulty: Difficulty;
  /** Thinking budget for Hard, in ms. */
  budgetMs?: number;
}

export type BotMove = { type: "call"; value: number } | { type: "play"; card: Card };
