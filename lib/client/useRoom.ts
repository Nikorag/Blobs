"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, RoomView } from "@/lib/game/types";
import { ApiError, pollRoom, sendAction } from "./api";

export type RoomStatus = "loading" | "ready" | "needsJoin" | "notFound" | "offline";

const POLL_VISIBLE_MS = 1200;
const POLL_HIDDEN_MS = 5000;

/**
 * Keeps a RoomView fresh by polling (Vercel functions can't hold sockets open) and
 * exposes `act` for sending actions. Action responses update the view immediately.
 */
export function useRoom(code: string, playerId: string | null) {
  const [view, setView] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<RoomStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const versionRef = useRef(-1);
  const offsetRef = useRef(0);
  const wakeRef = useRef<() => void>(() => {});

  const accept = useCallback((next: RoomView) => {
    offsetRef.current = next.serverNow - Date.now();
    if (next.version >= versionRef.current) {
      versionRef.current = next.version;
      setView(next);
    }
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (!playerId) return;
    versionRef.current = -1;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      let delay = document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS;
      try {
        const res = await pollRoom(code, playerId, versionRef.current);
        if (cancelled) return;
        if (res.view) accept(res.view);
        else if (res.now) offsetRef.current = res.now - Date.now();
        setStatus("ready");
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
  }, [code, playerId, accept]);

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
