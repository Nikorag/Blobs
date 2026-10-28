"use client";

import { useEffect, useRef } from "react";
import { useZonto } from "@/components/ZontoProvider";
import type { RoomView } from "@/lib/game/types";
import { earnedNow } from "./achievements";

/**
 * Unlocks Zonto achievements as the viewing player earns them. Unlocking is idempotent
 * on the platform, but we also remember what this tab already sent so polling doesn't
 * re-fire it. Never throws into gameplay.
 */
export function useZontoAchievements(view: RoomView | null): void {
  const { client, status } = useZonto();
  const sent = useRef(new Set<string>());
  const earned = view ? [...new Set(earnedNow(view))].sort().join("|") : "";

  useEffect(() => {
    if (status !== "signedIn" || !earned) return;
    for (const name of earned.split("|")) {
      if (sent.current.has(name)) continue;
      sent.current.add(name);
      client.unlock(name).catch(() => sent.current.delete(name));
    }
  }, [client, status, earned]);
}
