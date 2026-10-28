"use client";

import { useEffect } from "react";
import { useZonto } from "@/components/ZontoProvider";

const REPORT_EVERY_MS = 5 * 60_000;

/**
 * While `active`, shows the player as in-game on Zonto and reports playtime every
 * 5 minutes (plus the remainder when play stops). Never throws into gameplay.
 */
export function useZontoPlay(active: boolean): void {
  const { client, status } = useZonto();
  const live = active && status === "signedIn";

  useEffect(() => {
    if (!live) return;
    let reportedAt = Date.now();
    let ended = false;

    const report = () => {
      const minutes = Math.floor((Date.now() - reportedAt) / 60_000);
      if (minutes < 1) return;
      reportedAt += minutes * 60_000;
      client.reportProgress({ addMinutes: minutes }).catch(() => {});
    };
    const end = () => {
      if (ended) return;
      ended = true;
      report();
      client.endSession().catch(() => {});
    };

    client.startSession().catch(() => {});
    const timer = setInterval(report, REPORT_EVERY_MS);
    window.addEventListener("pagehide", end);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", end);
      end();
    };
  }, [live, client]);
}
