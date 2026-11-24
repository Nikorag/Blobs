import { gameFingerprint } from "@/lib/cosmetics/wallet";
import type { RoomView } from "@/lib/game/types";

/** Board slugs exactly as created in the Zonto CMS (game "blobs"). */
export const BOARDS = {
  /** Most points in one finished game with other people at the table. */
  bestScore: "best-score",
  /** Highest share of your calls hit exactly in one finished game, 0 to 100. */
  sharpestGame: "sharpest-game",
} as const;

export const BOARD_INFO = [
  { slug: BOARDS.bestScore, title: "Best Score", blurb: "Most points in one finished game with at least one other person.", unit: "pts" },
  { slug: BOARDS.sharpestGame, title: "Sharpest Game", blurb: "Share of your calls hit exactly in one finished game, any mode.", unit: "%" },
] as const;

/** The least number of rounds that counts for Sharpest Game, so one lucky one-card round can't top it. */
const MIN_ROUNDS = 4;

export interface Submission {
  board: string;
  value: number;
}

/**
 * What a finished game is worth to the viewing player on each board. Scores are reported by the
 * client, so a determined player could forge one: fine for a casual board, and the CMS rejects
 * values outside the possible range.
 */
export function scoresFor(view: RoomView): Submission[] {
  if (view.phase !== "End") return [];
  const mine = view.players.find((p) => p.id === view.you);
  if (!mine) return [];
  const out: Submission[] = [];
  const humans = view.players.filter((p) => !p.bot).length;
  if (humans >= 2) out.push({ board: BOARDS.bestScore, value: mine.total });
  const rounds = view.history.length;
  if (rounds >= MIN_ROUNDS) {
    const exact = view.history.filter((r) => r.calls[view.you] === r.tricks[view.you]).length;
    out.push({ board: BOARDS.sharpestGame, value: Math.round((100 * exact) / rounds) });
  }
  return out;
}

export { gameFingerprint };
