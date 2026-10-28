"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type CardStyle, type Slot, isOwned as ownedIn } from "@/lib/cosmetics/catalog";
import { award, buy as buyIn, emptyWallet, parseWallet, type Wallet } from "@/lib/cosmetics/wallet";
import type { Look } from "@/lib/game/look";
import { useZonto } from "./ZontoProvider";

type Status = "signedOut" | "loading" | "ready" | "unavailable";

interface CosmeticsState {
  /** `ready` once the cloud save has loaded; the store is only usable then. */
  status: Status;
  coins: number;
  cards: CardStyle;
  /** The blob the player last designed, if any. */
  savedLook: Look | null;
  isOwned: (slot: Slot, id: string) => boolean;
  buy: (slot: Slot, id: string) => boolean;
  equipCards: (style: CardStyle) => void;
  rememberLook: (look: Look) => void;
  /** Pay out a finished game once. */
  reward: (fingerprint: string, coins: number) => void;
}

const SAVE_DELAY_MS = 500;
const EMPTY = emptyWallet();

const CosmeticsContext = createContext<CosmeticsState | null>(null);

export function useCosmetics(): CosmeticsState {
  const ctx = useContext(CosmeticsContext);
  if (!ctx) throw new Error("useCosmetics must be used inside <CosmeticsProvider>");
  return ctx;
}

/** Coins and unlocked cosmetics, kept in the player's Zonto cloud save. Signed-out players only get the free items. */
export function CosmeticsProvider({ children }: { children: React.ReactNode }) {
  const { client, status: zontoStatus, player } = useZonto();
  // The save we loaded, and whose it is. `wallet: null` means loading it failed.
  const [loaded, setLoaded] = useState<{ userId: number; wallet: Wallet | null } | null>(null);
  const walletRef = useRef<Wallet>(emptyWallet());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = player?.id ?? null;
  const current = zontoStatus === "signedIn" && loaded?.userId === userId ? loaded : null;
  const wallet = current?.wallet ?? EMPTY;
  const ready = current?.wallet != null;

  useEffect(() => {
    // Never let a save queued for the previous player land on the next one's slot.
    if (timer.current) clearTimeout(timer.current);
    if (zontoStatus !== "signedIn" || userId === null) return;
    let cancelled = false;
    client
      .loadSave<unknown>()
      .then(({ data }) => {
        if (cancelled) return;
        walletRef.current = parseWallet(data);
        setLoaded({ userId, wallet: walletRef.current });
      })
      .catch(() => {
        // Cloud saves disabled or the platform is down: never block the game.
        if (!cancelled) setLoaded({ userId, wallet: null });
      });
    return () => {
      cancelled = true;
    };
  }, [client, zontoStatus, userId]);

  const commit = useCallback(
    (next: Wallet) => {
      walletRef.current = next;
      setLoaded((prev) => (prev ? { ...prev, wallet: next } : prev));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        client.saveGame(walletRef.current).catch(() => {});
      }, SAVE_DELAY_MS);
    },
    [client],
  );

  const owned = useMemo(() => new Set(wallet.owned), [wallet.owned]);

  const value = useMemo<CosmeticsState>(
    () => ({
      status: zontoStatus !== "signedIn" ? "signedOut" : !current ? "loading" : ready ? "ready" : "unavailable",
      coins: wallet.coins,
      cards: wallet.cards,
      savedLook: wallet.look,
      isOwned: (slot, id) => ownedIn(owned, slot, id),
      buy: (slot, id) => {
        if (!ready) return false;
        const next = buyIn(walletRef.current, slot, id);
        if (!next) return false;
        commit(next);
        return true;
      },
      equipCards: (style) => {
        if (!ready || !ownedIn(new Set(walletRef.current.owned), "cards", style)) return;
        commit({ ...walletRef.current, cards: style });
      },
      rememberLook: (look) => {
        if (ready) commit({ ...walletRef.current, look });
      },
      reward: (fingerprint, coins) => {
        if (!ready) return;
        const next = award(walletRef.current, fingerprint, coins);
        if (next !== walletRef.current) commit(next);
      },
    }),
    [zontoStatus, current, ready, wallet, owned, commit],
  );

  return <CosmeticsContext.Provider value={value}>{children}</CosmeticsContext.Provider>;
}
