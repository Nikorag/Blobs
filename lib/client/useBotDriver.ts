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
 * Computer players, and seats the server is playing for an absent human, only move when something
 * tells the server to. Every human's client does, so the table doesn't depend on one phone staying
 * awake. The server paces the moves and ignores duplicates; seats further down the table just wait
 * longer before asking, so normally only the first human's client makes the request.
 *
 * The same hook skips a human who has run out the turn clock, and takes this player's seat back
 * if the server had been playing it for them.
 */
export function useBotDriver(room: RoomHandle): void {
  const { view, act, serverNow } = room;
  const playing = view !== null && (view.phase === "Call" || view.phase === "Play");
  const turnPlayer = playing ? view.players.find((p) => p.id === view.turnId) : undefined;
  const botsTurn = !!turnPlayer && (!!turnPlayer.bot || turnPlayer.away);
  const afterTrick = view !== null && view.phase === "Play" && view.trick.length === 0 && view.lastTrick !== null;
  const version = view?.version;
  // This player's place among the humans, host first if they're seated first.
  const rank = view ? view.players.filter((p) => !p.bot).findIndex((p) => p.id === view.you) : -1;
  const deadline = view?.turnDeadline ?? null;
  const waitingOnSomeoneElse = deadline !== null && view?.turnId !== view?.you;
  const imAway = !!view?.players.find((p) => p.id === view.you)?.away;

  useEffect(() => {
    if (rank < 0 || (!botsTurn && !waitingOnSomeoneElse)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const type = botsTurn ? "botTurn" : "nudge";
    const attempt = async () => {
      if (cancelled) return;
      await act({ type });
      // A success changes the view, which re-runs this effect. If nothing changed (too early, offline,
      // someone else got there first) try again shortly.
      if (!cancelled) timer = setTimeout(attempt, RETRY_MS);
    };
    const wait = botsTurn
      ? (afterTrick ? TRICK_PAUSE_MS : 0) + THINK_MIN_MS + Math.random() * THINK_SPREAD_MS
      : Math.max(0, (deadline ?? 0) - serverNow()) + 250;
    timer = setTimeout(attempt, wait + rank * RANK_STAGGER_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rank, botsTurn, waitingOnSomeoneElse, deadline, afterTrick, version, act, serverNow]);

  // Back at the table: tell the server so it stops playing this seat.
  useEffect(() => {
    if (imAway) void act({ type: "back" });
  }, [imAway, act]);
}
