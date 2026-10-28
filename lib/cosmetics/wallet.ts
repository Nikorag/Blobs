import type { Look } from "@/lib/game/look";
import { cleanLook, defaultLook } from "@/lib/game/look";
import type { RoomView } from "@/lib/game/types";
import { scoreFor } from "@/lib/game/engine";
import { SOLO_CODE } from "@/lib/solo/code";
import { CARD_STYLES, type CardStyle, type Slot, itemKey, price } from "./catalog";

/** Everything the store remembers for a player. Lives in their Zonto cloud save. */
export interface Wallet {
  v: 1;
  coins: number;
  /** itemKey()s of paid items bought. */
  owned: string[];
  cards: CardStyle;
  /** The blob they last designed, re-applied when they join a lobby. */
  look: Look | null;
  /** Fingerprints of games already paid out, newest last. */
  awards: string[];
}

export const emptyWallet = (): Wallet => ({ v: 1, coins: 0, owned: [], cards: "classic", look: null, awards: [] });

const MAX_AWARDS = 40;

/** Read a cloud save defensively; anything unrecognised falls back to empty. */
export function parseWallet(data: unknown): Wallet {
  const raw = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);
  const fresh = emptyWallet();
  return {
    v: 1,
    coins: Number.isFinite(raw.coins) ? Math.max(0, Math.floor(raw.coins as number)) : 0,
    owned: strings(raw.owned),
    cards: CARD_STYLES.includes(raw.cards as CardStyle) ? (raw.cards as CardStyle) : fresh.cards,
    look: raw.look ? cleanLook(raw.look, defaultLook(0)) : null,
    awards: strings(raw.awards).slice(-MAX_AWARDS),
  };
}

/** Buy an item. Null if it's free, already owned or too expensive. */
export function buy(wallet: Wallet, slot: Slot, id: string): Wallet | null {
  const cost = price(slot, id);
  const key = itemKey(slot, id);
  if (cost === 0 || wallet.owned.includes(key) || wallet.coins < cost) return null;
  return { ...wallet, coins: wallet.coins - cost, owned: [...wallet.owned, key] };
}

/** Pay out `coins` once per `fingerprint`. */
export function award(wallet: Wallet, fingerprint: string, coins: number): Wallet {
  if (coins <= 0 || wallet.awards.includes(fingerprint)) return wallet;
  return { ...wallet, coins: wallet.coins + coins, awards: [...wallet.awards, fingerprint].slice(-MAX_AWARDS) };
}

const FINISH = 15;
const WIN = 10;
const SPOT_ON = 2;

/** Coins a finished game is worth to the viewing player. Any game with computer players pays half. */
export function gameReward(view: RoomView): number {
  if (view.phase !== "End") return 0;
  const best = Math.max(...view.players.map((p) => p.total));
  const mine = view.players.find((p) => p.id === view.you);
  if (!mine) return 0;
  const spotOn = view.history.filter((r) => r.calls[view.you] === r.tricks[view.you]).length;
  const total = FINISH + (mine.total === best ? WIN : 0) + SPOT_ON * spotOn;
  return view.code === SOLO_CODE || view.players.some((p) => p.bot) ? Math.ceil(total / 2) : total;
}

/** A stable id for one finished game (the deals are random, so the scoreline is unique in practice). */
export function gameFingerprint(view: RoomView): string {
  const rounds = view.history.map((r) => view.players.map((p) => `${scoreFor(r, p.id)}`).join(",")).join(";");
  let h = 5381;
  for (let i = 0; i < rounds.length; i++) h = ((h * 33) ^ rounds.charCodeAt(i)) >>> 0;
  return `${view.code}:${view.history.length}:${h.toString(36)}`;
}
