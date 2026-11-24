import { describe, expect, it } from "vitest";
import { applyAction, createRoom, joinRoom, toView } from "@/lib/game/engine";
import type { Room, RoundResult } from "@/lib/game/types";
import { BOARDS, scoresFor } from "./leaderboards";

function finished(humans: number, bots: number, rounds: RoundResult[]) {
  const room: Room = createRoom("ABCD", "p1", "One", 0);
  for (let i = 2; i <= humans; i++) joinRoom(room, `p${i}`, `P${i}`);
  for (let i = 0; i < bots; i++) applyAction(room, "p1", { type: "addBot", level: "hard" }, { now: 0, rng: Math.random });
  room.phase = "End";
  room.history = rounds;
  return room;
}

const round = (calls: number, tricks: number): RoundResult => ({ cards: 3, calls: { p1: calls, p2: 0 }, tricks: { p1: tricks, p2: 0 } });

describe("scoresFor", () => {
  it("submits nothing until the game has ended", () => {
    const room = finished(2, 0, [round(1, 1)]);
    room.phase = "Play";
    expect(scoresFor(toView(room, "p1", 0))).toEqual([]);
  });

  it("scores Best Score only when another human was at the table", () => {
    const rounds = [round(1, 1), round(2, 2), round(0, 1), round(1, 1)];
    const online = scoresFor(toView(finished(2, 0, rounds), "p1", 0));
    expect(online).toContainEqual({ board: BOARDS.bestScore, value: 1 + 2 - 1 + 1 });
    const solo = scoresFor(toView(finished(1, 2, rounds), "p1", 0));
    expect(solo.find((s) => s.board === BOARDS.bestScore)).toBeUndefined();
  });

  it("scores Sharpest Game as the percentage of exact calls, in any mode, over enough rounds", () => {
    const rounds = [round(1, 1), round(2, 2), round(0, 1), round(1, 0)];
    expect(scoresFor(toView(finished(1, 2, rounds), "p1", 0))).toContainEqual({ board: BOARDS.sharpestGame, value: 50 });
    expect(scoresFor(toView(finished(1, 2, rounds.slice(0, 3)), "p1", 0)).find((s) => s.board === BOARDS.sharpestGame)).toBeUndefined();
  });
});
