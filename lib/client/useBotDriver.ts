"use client";

import { useEffect } from "react";
import type { RoomHandle } from "./roomHandle";

const THINK_MIN_MS = 600;
const THINK_SPREAD_MS = 800;
/** How long a finished trick stays on the table before the next computer player acts. */
const TRICK_PAUSE_MS = 1500;
const RETRY_MS = 2000;
/** Extra wait per human seat above the first, so they only step in when the earlier ones are away. */
const RANK_STAGGER_MS = 2500;

/**
 * Computer players in an online room are played by the server, but something has to tell it when
 * to move. Every human's client does, so the table doesn't depend on one phone staying awake. The
 * server paces the moves and ignores duplicates; seats further down the table just wait longer
 * before asking, so normally only the first human's client makes the request.
 */
export function useBotDriver(room: RoomHandle): void {
  const { view, act } = room;
  const playing = view !== null && (view.phase === "Call" || view.phase === "Play");
  const botsTurn = playing && view.players.some((p) => p.id === view.turnId && p.bot);
  const afterTrick = view !== null && view.phase === "Play" && view.trick.length === 0 && view.lastTrick !== null;
  const version = view?.version;
  // This player's place among the humans, host first if they're seated first.
  const rank = view ? view.players.filter((p) => !p.bot).findIndex((p) => p.id === view.you) : -1;

  useEffect(() => {
    if (rank < 0 || !botsTurn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = async () => {
      if (cancelled) return;
      await act({ type: "botTurn" });
      // A success changes the view, which re-runs this effect. If nothing changed (too early, offline,
      // someone else got there first) try again shortly.
      if (!cancelled) timer = setTimeout(attempt, RETRY_MS);
    };
    timer = setTimeout(attempt, (afterTrick ? TRICK_PAUSE_MS : 0) + THINK_MIN_MS + Math.random() * THINK_SPREAD_MS + rank * RANK_STAGGER_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rank, botsTurn, afterTrick, version, act]);
}
