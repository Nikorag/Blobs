import type { RoundMemory } from "@/lib/ai/types";
import type { EmoteId } from "./emotes";
import type { Look } from "./look";

export type Suit = "c" | "h" | "d" | "s";

/** rank runs 2..14 (11 = jack, 12 = queen, 13 = king, 14 = ace) */
export interface Card {
  rank: number;
  suit: Suit;
}

export interface PlayedCard {
  card: Card;
  playerId: string;
}

export type Difficulty = "easy" | "normal" | "hard";

export type Phase = "Lobby" | "Call" | "Play" | "Recap" | "End";

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  look: Look;
  hand: Card[];
  /** Set for computer-controlled players. */
  bot?: Difficulty;
}

export interface RoundResult {
  cards: number;
  /** playerId -> number of tricks called */
  calls: Record<string, number>;
  /** playerId -> number of tricks won */
  tricks: Record<string, number>;
}

export interface LastTrick {
  cards: PlayedCard[];
  winnerId: string;
}

/** Full server-side room state. Never sent to clients as-is (it contains every hand). */
export interface Room {
  code: string;
  version: number;
  createdAt: number;
  hostId: string;
  phase: Phase;
  /** Seating order. Fixed for the whole game. */
  players: Player[];
  startingCards: number;
  cardsThisRound: number;
  roundNumber: number;
  dealerIdx: number;
  /** Index into `players` of whoever must act next. */
  turnIdx: number;
  trump: Card | null;
  calls: Record<string, number>;
  tricks: Record<string, number>;
  trick: PlayedCard[];
  lastTrick: LastTrick | null;
  history: RoundResult[];
  /** ms epoch at which the recap auto-advances */
  recapAt: number | null;
  recapReady: string[];
  /** Each player's latest emote (absent on rooms created before emotes existed). */
  emotes?: Record<string, { emote: EmoteId; at: number }>;
  /** What the computer players remember of the round (public information only). Never sent to clients. */
  botMemory?: RoundMemory;
}

export interface PublicPlayer {
  id: string;
  name: string;
  ready: boolean;
  look: Look;
  handCount: number;
  /** call for the current round, if made */
  call: number | null;
  tricks: number;
  total: number;
  isHost: boolean;
  bot?: Difficulty;
  /** Their latest emote; the client decides whether it is still fresh. */
  emote: { emote: EmoteId; at: number } | null;
}

/** What a single player is allowed to see. */
export interface RoomView {
  code: string;
  version: number;
  serverNow: number;
  you: string;
  hostId: string;
  phase: Phase;
  players: PublicPlayer[];
  myHand: Card[];
  playable: Card[];
  trump: Card | null;
  cardsThisRound: number;
  totalRounds: number;
  roundNumber: number;
  dealerId: string | null;
  turnId: string | null;
  trick: PlayedCard[];
  lastTrick: LastTrick | null;
  /** The one call the dealer is not allowed to make (or null). */
  forbiddenCall: number | null;
  history: RoundResult[];
  recapAt: number | null;
  recapReady: string[];
}

export type Action =
  | { type: "rename"; name: string }
  | { type: "ready"; ready: boolean }
  | { type: "look"; look: Look }
  | { type: "emote"; emote: EmoteId }
  | { type: "addBot"; level: Difficulty }
  /** Host only: have the computer player whose turn it is take it. Handled by the server, not the engine. */
  | { type: "botTurn" }
  | { type: "kick"; targetId: string }
  | { type: "start" }
  | { type: "call"; value: number }
  | { type: "play"; card: Card }
  | { type: "advance" }
  | { type: "reset" }
  | { type: "leave" };
