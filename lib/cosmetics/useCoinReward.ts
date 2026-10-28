"use client";

import { useEffect } from "react";
import { useCosmetics } from "@/components/CosmeticsProvider";
import type { RoomView } from "@/lib/game/types";
import { gameFingerprint, gameReward } from "./wallet";

/** Pays out coins when a game ends (once per game) and returns how many it was worth, or 0 mid-game. */
export function useCoinReward(view: RoomView): number {
  const { status, reward } = useCosmetics();
  const coins = gameReward(view);
  const fingerprint = coins > 0 ? gameFingerprint(view) : "";

  useEffect(() => {
    if (coins > 0 && status === "ready") reward(fingerprint, coins);
  }, [coins, fingerprint, status, reward]);

  return status === "ready" ? coins : 0;
}
