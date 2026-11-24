import { describe, expect, it } from "vitest";
import { applyAction, createRoom, toView, TURN_TIMEOUT_MS } from "@/lib/game/engine";
import type { Room } from "@/lib/game/types";
import { BOT_MIN_GAP_MS, BOT_TRICK_PAUSE_MS, claimSeat, nudgeTurn, playBotTurn, syncBotMemory } from "./bots";

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

describe("turn timeouts", () => {
  function table() {
    const room = createRoom("ABCD", "host", "Host", 0);
    const ctx = { now: 0, rng: Math.random };
    joinGuest(room);
    applyAction(room, "guest-1", { type: "ready", ready: true }, ctx);
    applyAction(room, "host", { type: "start" }, ctx);
    return room;
  }
  const turnOf = (room: Room) => room.players[room.turnIdx].id;
  const other = (room: Room) => (turnOf(room) === "host" ? "guest-1" : "host");

  it("does nothing before the deadline, or for your own turn", () => {
    const room = table();
    const before = JSON.stringify(room);
    nudgeTurn(room, other(room), TURN_TIMEOUT_MS - 1);
    nudgeTurn(room, turnOf(room), TURN_TIMEOUT_MS + 1);
    expect(JSON.stringify(room)).toBe(before);
  });

  it("plays a legal move for the absent player once the deadline passes", () => {
    const room = table();
    const absent = turnOf(room);
    const t = TURN_TIMEOUT_MS + 1;
    expect(toView(room, other(room), 0).turnDeadline).toBe(TURN_TIMEOUT_MS);
    nudgeTurn(room, other(room), t);
    expect(room.calls[absent]).toBeTypeOf("number");
    expect(room.missed?.[absent]).toBe(1);
    expect(room.away ?? []).not.toContain(absent);
  });

  it("only ever plays legal cards, and hands the seat to the server after repeated misses", () => {
    const room = table();
    const absent = turnOf(room);
    let now = 0;
    let guard = 0;
    while (room.phase !== "End" && guard++ < 500) {
      if (room.phase === "Recap") {
        now += 10_000;
        applyAction(room, "host", { type: "advance" }, { now, rng: Math.random });
        applyAction(room, "guest-1", { type: "advance" }, { now, rng: Math.random });
      } else if (turnOf(room) === absent) {
        now += TURN_TIMEOUT_MS + 1;
        const handBefore = room.players.find((p) => p.id === absent)!.hand.length;
        nudgeTurn(room, other(room), now); // throws via the engine if the move were illegal
        if (!room.away?.includes(absent)) expect(room.players.find((p) => p.id === absent)!.hand.length).toBeLessThanOrEqual(handBefore);
        // Once away, the server's own driver plays the seat without any further 60 s wait.
        if (room.away?.includes(absent) && turnOf(room) === absent) {
          now += BOT_MIN_GAP_MS + BOT_TRICK_PAUSE_MS;
          playBotTurn(room, other(room), now);
        }
      } else {
        const id = turnOf(room);
        const view = toView(room, id, now);
        const action = room.phase === "Call" ? { type: "call" as const, value: view.forbiddenCall === 0 ? 1 : 0 } : { type: "play" as const, card: view.playable[0] };
        applyAction(room, id, action, { now, rng: Math.random });
        claimSeat(room, id);
      }
    }
    expect(room.phase).toBe("End");
    expect(room.away).toContain(absent);
  }, 60_000);

  it("gives the seat back when the player returns", () => {
    const room = table();
    const absent = turnOf(room);
    room.away = [absent];
    room.missed = { [absent]: 3 };
    expect(toView(room, other(room), 0).players.find((p) => p.id === absent)?.away).toBe(true);
    expect(toView(room, other(room), 0).turnDeadline).toBeNull();
    claimSeat(room, absent);
    expect(room.away).toEqual([]);
    expect(room.missed[absent]).toBe(0);
    expect(toView(room, other(room), 0).turnDeadline).toBe(TURN_TIMEOUT_MS);
  });

  it("has no deadline in a game with one human", () => {
    const room = createRoom("ABCD", "human-1", "Me", 0);
    applyAction(room, "human-1", { type: "addBot", level: "easy" }, { now: 0, rng: Math.random });
    applyAction(room, "human-1", { type: "start" }, { now: 0, rng: Math.random });
    expect(toView(room, "human-1", 0).turnDeadline).toBeNull();
  });
});
