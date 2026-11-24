"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, RoomView } from "@/lib/game/types";
import { ApiError, pollRoom, sendAction } from "./api";

export type RoomStatus = "loading" | "ready" | "needsJoin" | "notFound" | "offline";

const POLL_VISIBLE_MS = 1200;
const POLL_HIDDEN_MS = 5000;
/** Mid-game and waiting on someone else: nothing for you to do, so look a little less often. */
const POLL_WAITING_MS = 3000;
/** You are next after whoever is playing now: a bit quicker so your turn arrives promptly. */
const POLL_UP_NEXT_MS = 1800;
/** The game is over. Still watch (the host can start a new one) but gently. */
const POLL_ENDED_MS = 5000;

/** How long to wait before the next poll, given what this player can see. Exported for tests. */
export function pollDelay(view: RoomView | null, hidden: boolean, board: boolean): number {
  if (hidden) return POLL_HIDDEN_MS;
  if (!view) return POLL_VISIBLE_MS;
  if (view.phase === "End") return POLL_ENDED_MS;
  if (board) return POLL_VISIBLE_MS; // the Board is a shared screen: keep it lively
  if (view.phase !== "Call" && view.phase !== "Play") return POLL_VISIBLE_MS;
  if (view.turnId === view.you) return POLL_VISIBLE_MS;
  // The player due to go after the current one polls a bit faster so their turn arrives promptly.
  const turn = view.players.findIndex((p) => p.id === view.turnId);
  const next = view.players[(turn + 1) % view.players.length];
  return next?.id === view.you ? POLL_UP_NEXT_MS : POLL_WAITING_MS;
}

/**
 * Keeps a RoomView fresh by polling (Vercel functions can't hold sockets open) and
 * exposes `act` for sending actions. Action responses update the view immediately.
 * With `board` set it watches as a spectator (The Board) and never needs a player id.
 */
export function useRoom(code: string, playerId: string | null, board = false) {
  const [view, setView] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<RoomStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const versionRef = useRef(-1);
  const offsetRef = useRef(0);
  const viewRef = useRef<RoomView | null>(null);
  const wakeRef = useRef<() => void>(() => {});

  const accept = useCallback((next: RoomView) => {
    offsetRef.current = next.serverNow - Date.now();
    if (next.version >= versionRef.current) {
      versionRef.current = next.version;
      viewRef.current = next;
      setView(next);
    }
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (!playerId && !board) return;
    versionRef.current = -1;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      let delay = pollDelay(viewRef.current, document.hidden, board);
      try {
        const res = await pollRoom(code, board ? null : playerId, versionRef.current);
        if (cancelled) return;
        if (res.view) accept(res.view);
        else if (res.now) offsetRef.current = res.now - Date.now();
        setStatus("ready");
        delay = pollDelay(viewRef.current, document.hidden, board);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus("notFound");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setStatus("needsJoin");
          return;
        }
        setStatus((s) => (s === "ready" ? s : "offline"));
        delay = 3000;
      }
      timer = setTimeout(tick, delay);
    };

    wakeRef.current = () => {
      clearTimeout(timer);
      tick();
    };
    tick();
    const onVisible = () => !document.hidden && wakeRef.current();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [code, playerId, board, accept]);

  const act = useCallback(
    async (action: Action): Promise<boolean> => {
      if (!playerId) return false;
      setBusy(true);
      try {
        const res = await sendAction(code, playerId, action);
        accept(res.view);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        wakeRef.current();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, playerId, accept],
  );

  const clearError = useCallback(() => setError(null), []);
  /** Re-run the poll loop (used after joining). */
  const refresh = useCallback(() => wakeRef.current(), []);
  /** Server time now, corrected for clock skew. */
  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return { view, status, error, clearError, busy, act, refresh, serverNow };
}
