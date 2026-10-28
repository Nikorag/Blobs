import { describe, expect, it } from "vitest";
import type { RoomView } from "@/lib/game/types";
import { ACHIEVEMENTS, earnedAtEnd } from "./achievements";

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
