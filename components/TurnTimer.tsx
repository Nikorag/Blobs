"use client";

import { useEffect, useState } from "react";
import { TURN_WARN_MS } from "@/lib/game/engine";

/** Ticks once a second while the countdown is showing. Returns ms left, or null if it isn't due yet. */
export function useTurnCountdown(deadline: number | null, serverNow: () => number): number | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [deadline]);
  if (deadline === null) return null;
  const left = deadline - serverNow();
  return left <= TURN_WARN_MS ? Math.max(0, left) : null;
}

/** A small countdown pill for the last seconds of a turn. */
export function TurnTimer({ left, className = "" }: { left: number; className?: string }) {
  const secs = Math.ceil(left / 1000);
  return (
    <span
      role="timer"
      aria-label={`${secs} seconds left`}
      className={`inline-flex items-center gap-1 rounded-full bg-bad/20 px-2 py-0.5 text-xs font-black tabular-nums text-bad ${className}`}
    >
      <span aria-hidden>⏱</span>
      {secs}s
    </span>
  );
}
