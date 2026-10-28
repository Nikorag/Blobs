import { describe, expect, it } from "vitest";
import type { RoomView } from "@/lib/game/types";
import { ACHIEVEMENTS, earnedAtEnd, earnedFromRounds, earnedFromTrick } from "./achievements";

function view(totals: [number, number], rounds: { calls: number; tricks: number }[]): RoomView {
  return {
    you: "a",
    players: [
      { id: "a", total: totals[0] },
      { id: "b", total: totals[1] },
    ],
    history: rounds.map((r) => ({ cards: 1, calls: { a: r.calls, b: 0 }, tricks: { a: r.tricks, b: 0 } })),
  } as unknown as RoomView;
}

describe("earnedAtEnd", () => {
  it("always awards finishing", () => {
    expect(earnedAtEnd(view([1, 5], [{ calls: 1, tricks: 0 }]))).toEqual([ACHIEVEMENTS.finished]);
  });

  it("awards a win, including ties", () => {
    expect(earnedAtEnd(view([5, 3], [{ calls: 1, tricks: 0 }]))).toContain(ACHIEVEMENTS.won);
    expect(earnedAtEnd(view([4, 4], [{ calls: 1, tricks: 0 }]))).toContain(ACHIEVEMENTS.won);
  });

  it("awards never blobbed only when every call was hit", () => {
    const hit = { calls: 1, tricks: 1 };
    expect(earnedAtEnd(view([2, 1], [hit, hit]))).toContain(ACHIEVEMENTS.neverBlobbed);
    expect(earnedAtEnd(view([2, 1], [hit, { calls: 1, tricks: 2 }]))).not.toContain(ACHIEVEMENTS.neverBlobbed);
  });
});

const round = (cards: number, call: number, tricks: number) => ({ cards, calls: { a: call, b: 0 }, tricks: { a: tricks, b: 0 } });
const roundsView = (rounds: ReturnType<typeof round>[]) =>
  ({ you: "a", players: [], history: rounds }) as unknown as RoomView;

describe("earnedFromRounds", () => {
  it("awards nothing before any round is scored", () => {
    expect(earnedFromRounds(roundsView([]))).toEqual([]);
  });

  it("awards a hit and a miss", () => {
    expect(earnedFromRounds(roundsView([round(3, 1, 1)]))).toEqual([ACHIEVEMENTS.spotOn]);
    expect(earnedFromRounds(roundsView([round(3, 1, 2)]))).toEqual([ACHIEVEMENTS.blobbed]);
  });

  it("awards bounce back only for a hit straight after a miss", () => {
    expect(earnedFromRounds(roundsView([round(3, 1, 2), round(3, 1, 1)]))).toContain(ACHIEVEMENTS.bounceBack);
    expect(earnedFromRounds(roundsView([round(3, 1, 1), round(3, 1, 1)]))).not.toContain(ACHIEVEMENTS.bounceBack);
  });

  it("awards a hat trick for three hits in a row, not three in total", () => {
    const hit = round(3, 1, 1);
    expect(earnedFromRounds(roundsView([hit, hit, hit]))).toContain(ACHIEVEMENTS.hatTrick);
    expect(earnedFromRounds(roundsView([hit, hit, round(3, 1, 0), hit]))).not.toContain(ACHIEVEMENTS.hatTrick);
  });

  it("awards zero hero only for a hit zero on five or more cards", () => {
    expect(earnedFromRounds(roundsView([round(5, 0, 0)]))).toContain(ACHIEVEMENTS.zeroHero);
    expect(earnedFromRounds(roundsView([round(4, 0, 0)]))).not.toContain(ACHIEVEMENTS.zeroHero);
    expect(earnedFromRounds(roundsView([round(5, 0, 1)]))).not.toContain(ACHIEVEMENTS.zeroHero);
  });

  it("awards a clean sweep only for taking every trick of four or more", () => {
    expect(earnedFromRounds(roundsView([round(4, 4, 4)]))).toContain(ACHIEVEMENTS.cleanSweep);
    expect(earnedFromRounds(roundsView([round(3, 3, 3)]))).not.toContain(ACHIEVEMENTS.cleanSweep);
    expect(earnedFromRounds(roundsView([round(4, 3, 4)]))).not.toContain(ACHIEVEMENTS.cleanSweep);
  });
});

describe("earnedFromTrick", () => {
  const trickView = (cards: [string, number, string][], winnerId: string, trump: string | null) =>
    ({
      you: "a",
      trump: trump ? { rank: 9, suit: trump } : null,
      lastTrick: { winnerId, cards: cards.map(([playerId, rank, suit]) => ({ playerId, card: { rank, suit } })) },
    }) as unknown as RoomView;

  it("awards ace high for winning with an ace", () => {
    expect(earnedFromTrick(trickView([["b", 5, "h"], ["a", 14, "h"]], "a", "s"))).toEqual([ACHIEVEMENTS.aceHigh]);
  });

  it("awards trump card for trumping a different suit", () => {
    expect(earnedFromTrick(trickView([["b", 14, "h"], ["a", 2, "s"]], "a", "s"))).toEqual([ACHIEVEMENTS.trumpCard]);
  });

  it("does not award trump card when trumps were led, or when someone else won", () => {
    expect(earnedFromTrick(trickView([["b", 5, "s"], ["a", 9, "s"]], "a", "s"))).toEqual([]);
    expect(earnedFromTrick(trickView([["b", 14, "h"], ["a", 2, "s"]], "b", "s"))).toEqual([]);
  });

  it("awards nothing with no trick", () => {
    expect(earnedFromTrick({ you: "a", lastTrick: null } as unknown as RoomView)).toEqual([]);
  });
});

describe("packed table", () => {
  it("is awarded only with eight players", () => {
    const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i ? `p${i}` : "a", total: 0 }));
    const mk = (n: number) => ({ you: "a", players: players(n), history: [] }) as unknown as RoomView;
    expect(earnedAtEnd(mk(8))).toContain(ACHIEVEMENTS.packedTable);
    expect(earnedAtEnd(mk(7))).not.toContain(ACHIEVEMENTS.packedTable);
  });
});
