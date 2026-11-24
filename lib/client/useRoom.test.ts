import { describe, expect, it } from "vitest";
import { applyAction, createRoom, joinRoom, toView } from "@/lib/game/engine";
import { pollDelay } from "./useRoom";

function game() {
  const room = createRoom("ABCD", "a", "A", 0);
  for (const id of ["b", "c", "d"]) joinRoom(room, id, id);
  for (const id of ["b", "c", "d"]) applyAction(room, id, { type: "ready", ready: true }, { now: 0, rng: Math.random });
  applyAction(room, "a", { type: "start" }, { now: 0, rng: Math.random });
  return room;
}

describe("pollDelay", () => {
  it("polls fast on your turn, a bit slower when you are up next, slowest when waiting", () => {
    const room = game();
    const turn = room.players[room.turnIdx].id;
    const next = room.players[(room.turnIdx + 1) % 4].id;
    const other = room.players.find((p) => p.id !== turn && p.id !== next)!.id;
    expect(pollDelay(toView(room, turn, 0), false, false)).toBe(1200);
    expect(pollDelay(toView(room, next, 0), false, false)).toBe(1800);
    expect(pollDelay(toView(room, other, 0), false, false)).toBe(3000);
  });

  it("keeps the lobby and the Board lively, and backs right off when hidden or finished", () => {
    const lobby = createRoom("ABCD", "a", "A", 0);
    expect(pollDelay(toView(lobby, "a", 0), false, false)).toBe(1200);
    const room = game();
    const other = room.players.find((p, i) => i !== room.turnIdx && i !== (room.turnIdx + 1) % 4)!.id;
    expect(pollDelay(toView(room, other, 0), false, true)).toBe(1200);
    expect(pollDelay(toView(room, other, 0), true, false)).toBe(5000);
    room.phase = "End";
    expect(pollDelay(toView(room, other, 0), false, false)).toBe(5000);
  });
});
