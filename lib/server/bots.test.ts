import { describe, expect, it } from "vitest";
import { applyAction, createRoom, toView } from "@/lib/game/engine";
import type { Room } from "@/lib/game/types";
import { playBotTurn, syncBotMemory } from "./bots";

describe("server-run computer players", () => {
  it("plays a whole game alongside a human, only when asked by the host", () => {
    const room: Room = createRoom("ABCD", "human-1", "Me", 0);
    const ctx = { now: 0, rng: Math.random };
    for (const level of ["easy", "normal", "hard"] as const) applyAction(room, "human-1", { type: "addBot", level }, ctx);
    applyAction(room, "human-1", { type: "start" }, ctx);

    let guard = 0;
    while (room.phase !== "End") {
      if (guard++ > 1000) throw new Error("game did not finish");
      if (room.phase === "Recap") {
        applyAction(room, "human-1", { type: "advance" }, { now: 1e12, rng: Math.random });
      } else if (room.players[room.turnIdx].bot) {
        expect(() => playBotTurn(room, "someone-else", 0)).toThrow();
        playBotTurn(room, "human-1", 0);
      } else {
        const view = toView(room, "human-1", 0);
        const action = room.phase === "Call"
          ? { type: "call" as const, value: view.forbiddenCall === 0 ? 1 : 0 }
          : { type: "play" as const, card: view.playable[0] };
        applyAction(room, "human-1", action, ctx);
      }
      syncBotMemory(room);
    }
    expect(room.history.length).toBeGreaterThan(0);
  }, 60_000);

  it("does nothing when it isn't a computer's turn", () => {
    const room = createRoom("ABCD", "human-1", "Me", 0);
    const ctx = { now: 0, rng: Math.random };
    applyAction(room, "human-1", { type: "addBot", level: "easy" }, ctx);
    applyAction(room, "human-1", { type: "start" }, ctx);
    room.turnIdx = 0;
    const before = JSON.stringify(room);
    playBotTurn(room, "human-1", 0);
    expect(JSON.stringify(room)).toBe(before);
  });
});
