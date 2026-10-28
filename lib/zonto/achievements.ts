import type { RoomView } from "@/lib/game/types";

/** Exact names as entered in the Zonto CMS — unlocking is by name. */
export const ACHIEVEMENTS = {
  spotOn: "Spot On",
  blobbed: "Blobbed",
  trumpCard: "Trump Card",
  aceHigh: "Ace High",
  bounceBack: "Bounce Back",
  zeroHero: "Zero Hero",
  hatTrick: "Hat Trick",
  cleanSweep: "Clean Sweep",
  finished: "Full House",
  won: "Top Blob",
  neverBlobbed: "Never Blobbed",
  packedTable: "Packed Table",
  /** Hidden: its description in the CMS must not give away how it is earned. */
  mvp: "MVP",
} as const;

const FULL_TABLE = 8;

/** What the viewing player has earned from the rounds scored so far. */
export function earnedFromRounds(view: RoomView): string[] {
  const me = view.you;
  const earned = new Set<string>();
  let streak = 0;
  let previousMissed = false;

  for (const round of view.history) {
    const call = round.calls[me];
    const won = round.tricks[me];
    if (call === undefined || won === undefined) continue;

    if (call === won) {
      earned.add(ACHIEVEMENTS.spotOn);
      streak += 1;
      if (previousMissed) earned.add(ACHIEVEMENTS.bounceBack);
      if (streak >= 3) earned.add(ACHIEVEMENTS.hatTrick);
      if (call === 0 && round.cards >= 5) earned.add(ACHIEVEMENTS.zeroHero);
      if (call === round.cards && round.cards >= 4) earned.add(ACHIEVEMENTS.cleanSweep);
      previousMissed = false;
    } else {
      earned.add(ACHIEVEMENTS.blobbed);
      streak = 0;
      previousMissed = true;
    }
  }
  return [...earned];
}

/** What the viewing player earned from the trick that was just taken, if they took it. */
export function earnedFromTrick(view: RoomView): string[] {
  const trick = view.lastTrick;
  if (!trick || trick.winnerId !== view.you) return [];
  const winning = trick.cards.find((pc) => pc.playerId === view.you)?.card;
  if (!winning) return [];

  const earned: string[] = [];
  if (winning.rank === 14) earned.push(ACHIEVEMENTS.aceHigh);
  // `trump` is cleared once the game ends, so a trick seen only then can't earn this.
  const ledSuit = trick.cards[0].card.suit;
  if (view.trump && winning.suit === view.trump.suit && ledSuit !== view.trump.suit) {
    earned.push(ACHIEVEMENTS.trumpCard);
  }
  return earned;
}

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
  // Computer players don't count towards a packed table.
  if (view.players.length === FULL_TABLE && view.players.every((p) => !p.bot)) earned.push(ACHIEVEMENTS.packedTable);
  return earned;
}

const MVP_NAME = "james keatley";

/** The secret one: sitting at the table under a particular name. */
export function earnedFromName(view: RoomView): string[] {
  const me = view.players.find((p) => p.id === view.you);
  return me?.name.trim().replace(/\s+/g, " ").toLowerCase() === MVP_NAME ? [ACHIEVEMENTS.mvp] : [];
}

/** Everything the viewing player has earned as of this view of the room. */
export function earnedNow(view: RoomView): string[] {
  const earned = [...earnedFromRounds(view), ...earnedFromTrick(view), ...earnedFromName(view)];
  if (view.phase === "End") earned.push(...earnedAtEnd(view));
  return earned;
}
