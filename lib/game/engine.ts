import { deal, legalPlays, sameCard, trickWinnerIndex } from "./cards";
import type { Action, Room, RoomView, RoundResult } from "./types";
import { cleanLook, defaultLook } from "./look";

export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
export const MAX_STARTING_CARDS = 7;
export const RECAP_MS = 8000;
export const BLOB_SCORE = -1;

export class GameError extends Error {}

export interface Ctx {
  now: number;
  rng: () => number;
}

const fail = (message: string): never => {
  throw new GameError(message);
};

export function createRoom(code: string, hostId: string, hostName: string, now: number): Room {
  return {
    code,
    version: 1,
    createdAt: now,
    hostId,
    phase: "Lobby",
    players: [{ id: hostId, name: cleanName(hostName), ready: false, look: defaultLook(0), hand: [] }],
    startingCards: MAX_STARTING_CARDS,
    cardsThisRound: MAX_STARTING_CARDS,
    roundNumber: 1,
    dealerIdx: 0,
    turnIdx: 0,
    trump: null,
    calls: {},
    tricks: {},
    trick: [],
    lastTrick: null,
    history: [],
    recapAt: null,
    recapReady: [],
  };
}

export function cleanName(name: string): string {
  const trimmed = (name ?? "").replace(/\s+/g, " ").trim().slice(0, 16);
  return trimmed || "Player";
}

export function startingCardsFor(playerCount: number): number {
  return Math.min(MAX_STARTING_CARDS, Math.floor(51 / playerCount));
}

export function joinRoom(room: Room, playerId: string, name: string): void {
  if (room.players.some((p) => p.id === playerId)) return;
  if (room.phase !== "Lobby") fail("That game has already started");
  if (room.players.length >= MAX_PLAYERS) fail("That room is full");
  room.players.push({ id: playerId, name: cleanName(name), ready: false, look: defaultLook(room.players.length), hand: [] });
}

export function scoreFor(result: RoundResult, playerId: string): number {
  const call = result.calls[playerId];
  return call === result.tricks[playerId] ? call : BLOB_SCORE;
}

export function totalScore(room: Room, playerId: string): number {
  return room.history.reduce((sum, r) => sum + scoreFor(r, playerId), 0);
}

function indexOfPlayer(room: Room, playerId: string): number {
  return room.players.findIndex((p) => p.id === playerId);
}

/** The one call the final caller (the dealer) may not make, so the calls never add up to the trick count. */
function forbiddenCallFor(room: Room, playerId: string): number | null {
  if (room.phase !== "Call") return null;
  if (Object.keys(room.calls).length !== room.players.length - 1) return null;
  if (room.players[room.turnIdx]?.id !== playerId) return null;
  const total = Object.values(room.calls).reduce((a, b) => a + b, 0);
  const forbidden = room.cardsThisRound - total;
  return forbidden >= 0 ? forbidden : null;
}

function startRound(room: Room, ctx: Ctx): void {
  const { hands, trump } = deal(room.cardsThisRound, room.players.length, ctx.rng);
  room.players.forEach((p, i) => (p.hand = hands[i]));
  room.trump = trump;
  room.phase = "Call";
  room.calls = {};
  room.tricks = Object.fromEntries(room.players.map((p) => [p.id, 0]));
  room.trick = [];
  room.lastTrick = null;
  room.recapAt = null;
  room.recapReady = [];
  // The player after the dealer calls first; the dealer calls last.
  room.turnIdx = (room.dealerIdx + 1) % room.players.length;
}

function finishRound(room: Room, ctx: Ctx): void {
  room.history.push({
    cards: room.cardsThisRound,
    calls: { ...room.calls },
    tricks: { ...room.tricks },
  });
  room.phase = "Recap";
  room.recapAt = ctx.now + RECAP_MS;
  room.recapReady = [];
}

function nextRound(room: Room, ctx: Ctx): void {
  room.cardsThisRound -= 1;
  room.roundNumber += 1;
  if (room.cardsThisRound <= 0) {
    room.phase = "End";
    room.trump = null;
    room.recapAt = null;
    room.players.forEach((p) => (p.hand = []));
    return;
  }
  room.dealerIdx = (room.dealerIdx + 1) % room.players.length;
  startRound(room, ctx);
}

/** Apply an action to the room in place. Throws GameError if it is not allowed. */
export function applyAction(room: Room, playerId: string, action: Action, ctx: Ctx): void {
  const me = indexOfPlayer(room, playerId);
  if (me === -1) fail("You are not in this room");
  const isHost = room.hostId === playerId;

  switch (action.type) {
    case "rename": {
      if (room.phase !== "Lobby") fail("You can only rename in the lobby");
      room.players[me].name = cleanName(action.name);
      room.players[me].ready = false;
      return;
    }

    case "look": {
      if (room.phase !== "Lobby") fail("You can only change your blob in the lobby");
      room.players[me].look = cleanLook(action.look, room.players[me].look);
      return;
    }

    case "ready": {
      if (room.phase !== "Lobby") fail("The game has already started");
      room.players[me].ready = !!action.ready;
      return;
    }

    case "leave": {
      if (room.phase !== "Lobby") fail("You can't leave a game in progress");
      room.players.splice(me, 1);
      if (room.hostId === playerId && room.players.length > 0) room.hostId = room.players[0].id;
      return;
    }

    case "kick": {
      if (!isHost) fail("Only the host can remove players");
      if (room.phase !== "Lobby") fail("You can only remove players in the lobby");
      if (action.targetId === playerId) fail("You can't remove yourself");
      room.players = room.players.filter((p) => p.id !== action.targetId);
      return;
    }

    case "start": {
      if (!isHost) fail("Only the host can start the game");
      if (room.phase !== "Lobby") fail("The game has already started");
      if (room.players.length < MIN_PLAYERS) fail("You need at least two players");
      if (room.players.some((p) => p.id !== room.hostId && !p.ready)) fail("Everyone must be ready");
      room.history = [];
      room.startingCards = startingCardsFor(room.players.length);
      room.cardsThisRound = room.startingCards;
      room.roundNumber = 1;
      // First dealer is the last seat, so seat 0 calls first.
      room.dealerIdx = room.players.length - 1;
      startRound(room, ctx);
      return;
    }

    case "call": {
      if (room.phase !== "Call") fail("It isn't the calling phase");
      if (room.turnIdx !== me) fail("It isn't your turn");
      const value = action.value;
      if (!Number.isInteger(value) || value < 0 || value > room.cardsThisRound) fail("Invalid call");
      if (value === forbiddenCallFor(room, playerId)) {
        fail("The dealer can't make the total equal the number of tricks");
      }
      room.calls[playerId] = value;
      if (Object.keys(room.calls).length === room.players.length) {
        room.phase = "Play";
        room.turnIdx = (room.dealerIdx + 1) % room.players.length;
      } else {
        room.turnIdx = (room.turnIdx + 1) % room.players.length;
      }
      return;
    }

    case "play": {
      if (room.phase !== "Play") fail("It isn't the playing phase");
      if (room.turnIdx !== me) fail("It isn't your turn");
      const player = room.players[me];
      const card = player.hand.find((c) => sameCard(c, action.card));
      if (!card) return fail("You don't hold that card");
      if (!legalPlays(player.hand, room.trick).some((c) => sameCard(c, card))) {
        fail("You must follow suit");
      }
      if (room.trick.length === 0) room.lastTrick = null;
      room.trick.push({ card, playerId });
      player.hand = player.hand.filter((c) => !sameCard(c, card));

      if (room.trick.length < room.players.length) {
        room.turnIdx = (room.turnIdx + 1) % room.players.length;
        return;
      }

      // Trick complete: the winner takes it and leads the next one.
      const winning = room.trick[trickWinnerIndex(room.trick, room.trump!)];
      room.tricks[winning.playerId] += 1;
      room.lastTrick = { cards: room.trick, winnerId: winning.playerId };
      room.trick = [];
      room.turnIdx = indexOfPlayer(room, winning.playerId);
      if (room.players.every((p) => p.hand.length === 0)) finishRound(room, ctx);
      return;
    }

    case "advance": {
      if (room.phase !== "Recap") return; // idempotent: someone else already advanced
      if (!room.recapReady.includes(playerId)) room.recapReady.push(playerId);
      const everyoneReady = room.players.every((p) => room.recapReady.includes(p.id));
      const timedOut = room.recapAt !== null && ctx.now >= room.recapAt;
      if (everyoneReady || timedOut) nextRound(room, ctx);
      return;
    }

    case "reset": {
      if (!isHost) fail("Only the host can end the game");
      room.phase = "Lobby";
      room.players.forEach((p) => {
        p.hand = [];
        p.ready = false;
      });
      room.trump = null;
      room.calls = {};
      room.tricks = {};
      room.trick = [];
      room.lastTrick = null;
      room.history = [];
      room.recapAt = null;
      room.recapReady = [];
      return;
    }

    default:
      fail("Unknown action");
  }
}

/** Build the redacted view a single player is allowed to see. */
export function toView(room: Room, playerId: string, now: number): RoomView {
  const me = room.players.find((p) => p.id === playerId);
  const myHand = me?.hand ?? [];
  const isMyPlay = room.phase === "Play" && room.players[room.turnIdx]?.id === playerId;
  return {
    code: room.code,
    version: room.version,
    serverNow: now,
    you: playerId,
    hostId: room.hostId,
    phase: room.phase,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      look: p.look ?? defaultLook(room.players.indexOf(p)),
      handCount: p.hand.length,
      call: room.calls[p.id] ?? null,
      tricks: room.tricks[p.id] ?? 0,
      total: totalScore(room, p.id),
      isHost: p.id === room.hostId,
      bot: p.bot,
    })),
    myHand,
    playable: isMyPlay ? legalPlays(myHand, room.trick) : [],
    trump: room.trump,
    cardsThisRound: room.cardsThisRound,
    totalRounds: room.startingCards,
    roundNumber: room.roundNumber,
    dealerId: room.phase === "Lobby" ? null : (room.players[room.dealerIdx]?.id ?? null),
    turnId:
      room.phase === "Call" || room.phase === "Play" ? (room.players[room.turnIdx]?.id ?? null) : null,
    trick: room.trick,
    lastTrick: room.lastTrick,
    forbiddenCall: forbiddenCallFor(room, playerId),
    history: room.history,
    recapAt: room.recapAt,
    recapReady: room.recapReady,
  };
}
