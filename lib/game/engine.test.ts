import { describe, expect, it } from "vitest";
import { createDeck, deal, legalPlays, trickWinnerIndex } from "./cards";
import { applyAction, createRoom, GameError, joinRoom, scoreFor, toView } from "./engine";
import type { Card, PlayedCard, Room } from "./types";

const c = (rank: number, suit: Card["suit"]): Card => ({ rank, suit });
const played = (...cards: Card[]): PlayedCard[] => cards.map((card, i) => ({ card, playerId: `p${i}` }));

let seed = 1;
const rng = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const ctx = (now = 0) => ({ now, rng });

function lobby(n: number): Room {
  const room = createRoom("ABCD", "p0", "P0", 0);
  for (let i = 1; i < n; i++) joinRoom(room, `p${i}`, `P${i}`);
  return room;
}

function started(n: number): Room {
  const room = lobby(n);
  room.players.forEach((p) => (p.ready = true));
  applyAction(room, "p0", { type: "start" }, ctx());
  return room;
}

/** Take whichever action the current actor would take, picking the first legal move. */
function step(room: Room, now = 1e9): void {
  const actor = room.players[room.turnIdx];
  if (room.phase === "Call") {
    const forbidden = toView(room, actor.id, 0).forbiddenCall;
    applyAction(room, actor.id, { type: "call", value: forbidden === 1 ? 0 : 1 }, ctx());
  } else if (room.phase === "Play") {
    const card = toView(room, actor.id, 0).playable[0];
    applyAction(room, actor.id, { type: "play", card }, ctx());
  } else if (room.phase === "Recap") {
    applyAction(room, "p0", { type: "advance" }, ctx(now));
  }
}

describe("dealing", () => {
  it("deals the right number of unique cards plus a trump", () => {
    for (const [players, each] of [[2, 7], [5, 5], [8, 6], [3, 1]]) {
      const { hands, trump } = deal(each, players, rng);
      expect(hands).toHaveLength(players);
      hands.forEach((h) => expect(h).toHaveLength(each));
      const all = [...hands.flat(), trump].map((x) => `${x.rank}${x.suit}`);
      expect(new Set(all).size).toBe(all.length);
    }
  });
  it("has a full deck", () => expect(createDeck()).toHaveLength(52));
});

describe("trickWinnerIndex", () => {
  it("highest of the led suit wins without trumps", () => {
    const t = played(c(10, "c"), c(8, "c"), c(11, "c"), c(3, "c"), c(12, "d"));
    expect(trickWinnerIndex(t, c(2, "h"))).toBe(2);
  });
  it("any trump beats the led suit, highest trump wins", () => {
    const t = played(c(14, "c"), c(2, "h"), c(9, "h"), c(13, "c"));
    expect(trickWinnerIndex(t, c(5, "h"))).toBe(2);
  });
  it("off-suit non-trump never wins", () => {
    const t = played(c(3, "c"), c(14, "d"), c(4, "c"));
    expect(trickWinnerIndex(t, c(2, "h"))).toBe(2);
  });
  it("the led card wins if everyone else is off suit", () => {
    const t = played(c(2, "c"), c(14, "d"), c(14, "s"));
    expect(trickWinnerIndex(t, c(2, "h"))).toBe(0);
  });
});

describe("legalPlays", () => {
  const hand = [c(2, "c"), c(9, "h"), c(4, "h")];
  it("anything when leading", () => expect(legalPlays(hand, [])).toEqual(hand));
  it("must follow suit", () => expect(legalPlays(hand, played(c(5, "h")))).toEqual([c(9, "h"), c(4, "h")]));
  it("anything when void", () => expect(legalPlays(hand, played(c(5, "s")))).toEqual(hand));
});

describe("lobby", () => {
  it("won't start without two ready players", () => {
    const room = lobby(1);
    expect(() => applyAction(room, "p0", { type: "start" }, ctx())).toThrow(GameError);
    joinRoom(room, "p1", "P1");
    expect(() => applyAction(room, "p0", { type: "start" }, ctx())).toThrow("ready");
  });
  it("only the host can start", () => {
    const room = lobby(3);
    room.players.forEach((p) => (p.ready = true));
    expect(() => applyAction(room, "p1", { type: "start" }, ctx())).toThrow("host");
  });
  it("blocks joining a started game but allows rejoining", () => {
    const room = started(3);
    expect(() => joinRoom(room, "newbie", "N")).toThrow("started");
    expect(() => joinRoom(room, "p1", "P1")).not.toThrow();
  });
  it("caps starting cards so the deck is never exhausted", () => {
    expect(started(8).cardsThisRound).toBe(6);
    expect(started(4).cardsThisRound).toBe(7);
  });
});

describe("calling", () => {
  it("seat 0 calls first and turns rotate", () => {
    const room = started(3);
    expect(room.phase).toBe("Call");
    expect(room.players[room.turnIdx].id).toBe("p0");
    expect(() => applyAction(room, "p1", { type: "call", value: 1 }, ctx())).toThrow("turn");
    applyAction(room, "p0", { type: "call", value: 2 }, ctx());
    expect(room.players[room.turnIdx].id).toBe("p1");
  });
  it("rejects out-of-range calls", () => {
    const room = started(3);
    expect(() => applyAction(room, "p0", { type: "call", value: 8 }, ctx())).toThrow("Invalid");
    expect(() => applyAction(room, "p0", { type: "call", value: -1 }, ctx())).toThrow("Invalid");
  });
  it("the dealer may not make the total equal the cards", () => {
    const room = started(3); // 7 cards
    applyAction(room, "p0", { type: "call", value: 3 }, ctx());
    applyAction(room, "p1", { type: "call", value: 2 }, ctx());
    expect(toView(room, "p2", 0).forbiddenCall).toBe(2);
    expect(toView(room, "p0", 0).forbiddenCall).toBeNull();
    expect(() => applyAction(room, "p2", { type: "call", value: 2 }, ctx())).toThrow("dealer");
    applyAction(room, "p2", { type: "call", value: 3 }, ctx());
    expect(room.phase).toBe("Play");
  });
});

describe("playing", () => {
  it("rejects cards you don't hold and off-suit plays when you could follow", () => {
    const room = started(2);
    room.cardsThisRound = 2;
    room.players[0].hand = [c(5, "h"), c(6, "c")];
    room.players[1].hand = [c(9, "h"), c(2, "s")];
    room.phase = "Play";
    room.turnIdx = 0;
    applyAction(room, "p0", { type: "play", card: c(5, "h") }, ctx());
    expect(() => applyAction(room, "p1", { type: "play", card: c(7, "d") }, ctx())).toThrow("hold");
    expect(() => applyAction(room, "p1", { type: "play", card: c(2, "s") }, ctx())).toThrow("follow suit");
    applyAction(room, "p1", { type: "play", card: c(9, "h") }, ctx());
    // p1 won the trick and leads next
    expect(room.lastTrick?.winnerId).toBe("p1");
    expect(room.players[room.turnIdx].id).toBe("p1");
    expect(room.tricks.p1).toBe(1);
  });
});

describe("views", () => {
  it("only reveals your own hand", () => {
    const room = started(3);
    const view = toView(room, "p1", 0);
    expect(view.myHand).toEqual(room.players[1].hand);
    expect(JSON.stringify(view)).not.toContain(JSON.stringify(room.players[0].hand));
    expect(view.players.every((p) => !("hand" in p))).toBe(true);
  });
});

describe("full games", () => {
  for (const n of [2, 3, 5, 8]) {
    it(`plays ${n} players through to the end`, () => {
      const room = started(n);
      let guard = 0;
      while (room.phase !== "End") {
        if (guard++ > 5000) throw new Error("game did not finish");
        step(room);
      }
      expect(room.history.map((r) => r.cards)).toEqual(
        Array.from({ length: room.startingCards }, (_, i) => room.startingCards - i),
      );
      for (const r of room.history) {
        expect(Object.values(r.tricks).reduce((a, b) => a + b, 0)).toBe(r.cards);
      }
    });
  }

  it("rotates the dealer one seat each round", () => {
    const room = started(4);
    const dealers = [room.dealerIdx];
    for (let i = 0; i < 3; i++) {
      const round = room.roundNumber;
      let guard = 0;
      while (room.roundNumber === round) {
        if (guard++ > 500) throw new Error("stuck");
        step(room);
      }
      dealers.push(room.dealerIdx);
    }
    expect(dealers).toEqual([3, 0, 1, 2]);
  });
});

describe("recap and scoring", () => {
  it("scores the call when exact and -1 for a blob", () => {
    const result = { cards: 3, calls: { a: 2, b: 1 }, tricks: { a: 2, b: 0 } };
    expect(scoreFor(result, "a")).toBe(2);
    expect(scoreFor(result, "b")).toBe(-1);
  });
  it("won't advance early unless everybody is ready", () => {
    const room = started(2);
    room.phase = "Recap";
    room.recapAt = 10_000;
    applyAction(room, "p0", { type: "advance" }, ctx(0));
    expect(room.phase).toBe("Recap");
    applyAction(room, "p1", { type: "advance" }, ctx(0));
    expect(room.phase).toBe("Call");
  });
  it("host can reset back to the lobby", () => {
    const room = started(3);
    expect(() => applyAction(room, "p1", { type: "reset" }, ctx())).toThrow("host");
    applyAction(room, "p0", { type: "reset" }, ctx());
    expect(room.phase).toBe("Lobby");
    expect(room.players.every((p) => !p.ready && p.hand.length === 0)).toBe(true);
  });
});
