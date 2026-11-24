import { describe, expect, it } from "vitest";
import { applyAction, createRoom, toView } from "@/lib/game/engine";
import type { Room } from "@/lib/game/types";
import { BOT_MIN_GAP_MS, BOT_TRICK_PAUSE_MS, playBotTurn, syncBotMemory } from "./bots";

describe("server-run computer players", () => {
  it("plays a whole game alongside a human, only when asked by a human at the table", () => {
    const room: Room = createRoom("ABCD", "human-1", "Me", 0);
    const ctx = { now: 0, rng: Math.random };
    for (const level of ["easy", "normal", "hard"] as const) applyAction(room, "human-1", { type: "addBot", level }, ctx);
    applyAction(room, "human-1", { type: "start" }, ctx);

    let guard = 0;
    let clock = 0;
    while (room.phase !== "End") {
      if (guard++ > 1000) throw new Error("game did not finish");
      if (room.phase === "Recap") {
        clock += 10_000;
        applyAction(room, "human-1", { type: "advance" }, { now: clock, rng: Math.random });
      } else if (room.players[room.turnIdx].bot) {
        expect(() => playBotTurn(room, "someone-else", clock)).toThrow();
        clock += BOT_MIN_GAP_MS + BOT_TRICK_PAUSE_MS;
        playBotTurn(room, "human-1", clock);
      } else {
        const view = toView(room, "human-1", clock);
        const action = room.phase === "Call"
          ? { type: "call" as const, value: view.forbiddenCall === 0 ? 1 : 0 }
          : { type: "play" as const, card: view.playable[0] };
        applyAction(room, "human-1", action, { now: clock, rng: Math.random });
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

  it("lets a guest drive the computers when the host's tab is closed", () => {
    const room = createRoom("ABCD", "host", "Host", 0);
    const ctx = { now: 0, rng: Math.random };
    joinGuest(room);
    applyAction(room, "host", { type: "addBot", level: "easy" }, ctx);
    applyAction(room, "guest-1", { type: "ready", ready: true }, ctx);
    applyAction(room, "host", { type: "start" }, ctx);
    room.turnIdx = room.players.findIndex((p) => p.bot);
    const botId = room.players[room.turnIdx].id;
    playBotTurn(room, "guest-1", 5000); // the host never asks
    expect(room.calls[botId]).toBeTypeOf("number");
  });

  it("applies each computer turn once however many clients ask, and keeps the pacing", () => {
    const room = createRoom("ABCD", "host", "Host", 0);
    const ctx = { now: 0, rng: Math.random };
    joinGuest(room);
    applyAction(room, "host", { type: "addBot", level: "easy" }, ctx);
    applyAction(room, "guest-1", { type: "ready", ready: true }, ctx);
    applyAction(room, "host", { type: "start" }, ctx);
    room.turnIdx = room.players.findIndex((p) => p.bot);

    const before = JSON.stringify(room);
    playBotTurn(room, "guest-1", BOT_MIN_GAP_MS - 1); // too soon after the deal
    expect(JSON.stringify(room)).toBe(before);

    const now = BOT_MIN_GAP_MS;
    playBotTurn(room, "guest-1", now);
    const afterFirst = JSON.stringify(room);
    expect(afterFirst).not.toBe(before);
    expect(room.moveAt).toBe(now);
    // The host asks at the same moment: the next player is human (or too early), so nothing moves.
    playBotTurn(room, "host", now);
    expect(JSON.stringify(room)).toBe(afterFirst);
  });
});

function joinGuest(room: Room): void {
  room.players.push({ id: "guest-1", name: "Guest", ready: false, look: room.players[0].look, hand: [] });
}
