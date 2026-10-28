"use client";

import { useEffect } from "react";
import type { RoomHandle } from "./roomHandle";

const THINK_MIN_MS = 600;
const THINK_SPREAD_MS = 800;
/** How long a finished trick stays on the table before the next computer player acts. */
const TRICK_PAUSE_MS = 1500;
const RETRY_MS = 2000;

/**
 * Computer players in an online room are played by the server, but something has to tell it when
 * to move so the table keeps a human pace. That's the host's browser; if the host drops out the
 * computers simply wait for them to come back.
 */
export function useBotDriver(room: RoomHandle): void {
  const { view, act } = room;
  const isHost = view !== null && view.hostId === view.you;
  const playing = view !== null && (view.phase === "Call" || view.phase === "Play");
  const botsTurn = playing && view.players.some((p) => p.id === view.turnId && p.bot);
  const afterTrick = view !== null && view.phase === "Play" && view.trick.length === 0 && view.lastTrick !== null;
  const version = view?.version;

  useEffect(() => {
    if (!isHost || !botsTurn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = async () => {
      if (cancelled) return;
      // A failed request (offline, conflict) is retried; success changes the view, which re-runs this effect.
      if (!(await act({ type: "botTurn" })) && !cancelled) timer = setTimeout(attempt, RETRY_MS);
    };
    timer = setTimeout(attempt, (afterTrick ? TRICK_PAUSE_MS : 0) + THINK_MIN_MS + Math.random() * THINK_SPREAD_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isHost, botsTurn, afterTrick, version, act]);
}
