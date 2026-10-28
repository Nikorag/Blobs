import type { RoomView } from "@/lib/game/types";

/** Exact names as entered in the Zonto CMS — unlocking is by name. */
export const ACHIEVEMENTS = {
  finished: "Full House",
  won: "Top Blob",
  neverBlobbed: "Never Blobbed",
} as const;

/** Which achievements a finished game earns the viewing player. */
export function earnedAtEnd(view: RoomView): string[] {
  const me = view.you;
  const best = Math.max(...view.players.map((p) => p.total));
  const mine = view.players.find((p) => p.id === me);
  if (!mine) return [];

  const earned: string[] = [ACHIEVEMENTS.finished];
  if (mine.total === best) earned.push(ACHIEVEMENTS.won);
  if (view.history.length > 0 && view.history.every((r) => r.calls[me] === r.tricks[me])) {
    earned.push(ACHIEVEMENTS.neverBlobbed);
  }
  return earned;
}
