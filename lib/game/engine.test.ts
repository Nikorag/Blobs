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

describe("look", () => {
  it("lets a player change their blob in the lobby and ignores junk values", () => {
    const room = createRoom("ABCD", "a", "Ann", 0);
    joinRoom(room, "b", "Bob");
    const ctx = { now: 0, rng: Math.random };
    applyAction(room, "b", { type: "look", look: { shape: "egg", eyes: "wink", mouth: "grin", skin: "gold", hat: "crown", cards: "mint", color: 5 } }, ctx);
    expect(room.players[1].look).toEqual({ shape: "egg", eyes: "wink", mouth: "grin", skin: "gold", hat: "crown", cards: "mint", color: 5 });
    applyAction(room, "b", { type: "look", look: { shape: "nope", eyes: "dots", mouth: "o", skin: "plain", hat: "nope", cards: "classic", color: 99 } as never }, ctx);
    expect(room.players[1].look).toEqual({ shape: "egg", eyes: "dots", mouth: "o", skin: "plain", hat: "crown", cards: "classic", color: 5 });
  });
});

describe("emotes", () => {
  it("shows an emote to everyone, rate limited per player", () => {
    const room = started(3);
    applyAction(room, "p1", { type: "emote", emote: "laugh" }, ctx(1000));
    expect(toView(room, "p0", 1000).players[1].emote).toEqual({ emote: "laugh", at: 1000 });
    applyAction(room, "p1", { type: "emote", emote: "wow" }, ctx(1500)); // too soon: ignored
    expect(room.emotes!.p1.emote).toBe("laugh");
    applyAction(room, "p1", { type: "emote", emote: "wow" }, ctx(2600));
    expect(room.emotes!.p1.emote).toBe("wow");
    applyAction(room, "p2", { type: "emote", emote: "party" }, ctx(1100)); // others aren't throttled by p1
    expect(room.emotes!.p2.emote).toBe("party");
  });

  it("ignores emotes outside the game and rejects unknown ones", () => {
    const room = lobby(2);
    applyAction(room, "p0", { type: "emote", emote: "laugh" }, ctx(1000));
    expect(room.emotes).toBeUndefined();
    const playing = started(2);
    expect(() => applyAction(playing, "p0", { type: "emote", emote: "nope" as never }, ctx(1000))).toThrow(GameError);
    expect(() => applyAction(playing, "p0", { type: "emote", emote: "toString" as never }, ctx(1000))).toThrow(GameError);
  });
});

describe("computer players in a lobby", () => {
  it("lets only the host add them, up to the table limit", () => {
    const room = lobby(2);
    expect(() => applyAction(room, "p1", { type: "addBot", level: "easy" }, ctx())).toThrow(GameError);
    applyAction(room, "p0", { type: "addBot", level: "hard" }, ctx());
    const bot = room.players[2];
    expect(bot).toMatchObject({ bot: "hard", ready: true });
    expect(new Set(room.players.map((p) => p.id)).size).toBe(3);
    for (let i = 0; i < 5; i++) applyAction(room, "p0", { type: "addBot", level: "easy" }, ctx());
    expect(room.players).toHaveLength(8);
    expect(() => applyAction(room, "p0", { type: "addBot", level: "easy" }, ctx())).toThrow(GameError);
    expect(() => applyAction(lobby(2), "p0", { type: "addBot", level: "nope" as never }, ctx())).toThrow(GameError);
  });

  it("starts with one human and one bot, and the host can remove a bot", () => {
    const room = lobby(1);
    applyAction(room, "p0", { type: "addBot", level: "normal" }, ctx());
    applyAction(room, "p0", { type: "kick", targetId: room.players[1].id }, ctx());
    expect(room.players).toHaveLength(1);
    applyAction(room, "p0", { type: "addBot", level: "normal" }, ctx());
    applyAction(room, "p0", { type: "start" }, ctx());
    expect(room.phase).toBe("Call");
  });

  it("never hands the table to a bot and clears it when the last human leaves", () => {
    const room = lobby(2);
    applyAction(room, "p0", { type: "addBot", level: "easy" }, ctx());
    room.players = [room.players[2], room.players[0], room.players[1]]; // bot seated first
    applyAction(room, "p0", { type: "leave" }, ctx());
    expect(room.hostId).toBe("p1");
    applyAction(room, "p1", { type: "leave" }, ctx());
    expect(room.players).toEqual([]);
  });

  it("doesn't wait for bots to dismiss the recap", () => {
    const room = started(2);
    room.players[1].bot = "easy";
    while (room.phase !== "Recap") step(room);
    applyAction(room, "p0", { type: "advance" }, ctx(0));
    expect(room.phase).not.toBe("Recap");
  });
});
