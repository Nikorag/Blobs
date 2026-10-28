"use client";

import { useCallback, useEffect, useState } from "react";
import { requestMove } from "@/lib/ai/botClient";
import type { RoomHandle } from "@/lib/client/roomHandle";
import { GameError } from "@/lib/game/engine";
import type { Action } from "@/lib/game/types";
import { HUMAN_ID } from "./create";
import { SoloEngine } from "./engine";
import { clearSolo, type SoloSave } from "./save";

const THINK_MIN_MS = 600;
const THINK_SPREAD_MS = 800;
/** How long a finished trick stays on the table before the next computer player acts. */
const TRICK_PAUSE_MS = 1500;

/**
 * Runs a game against the computer entirely in the browser, exposing the same handle the
 * online screens use. The human is always player "you"; bots take their turns on a timer.
 */
export function useSoloGame(initial: SoloSave, onQuit: () => void): RoomHandle {
  const [engine] = useState(() => new SoloEngine(initial));
  const [view, setView] = useState(() => engine.view());
  const [error, setError] = useState<string | null>(null);

  // Computer players: tap Next at the recap, and take their turns after a short think.
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const waiting = engine.botsAwaitingRecap();
    if (waiting.length > 0) {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          for (const p of waiting) engine.apply(p.id, { type: "advance" });
          setView(engine.view());
        }, 400),
      );
    }

    const bot = engine.botToAct();
    if (bot) {
      const think = (bot.afterTrick ? TRICK_PAUSE_MS : 0) + THINK_MIN_MS + Math.random() * THINK_SPREAD_MS;
      // Start computing straight away; the delay only gates when the move appears.
      const delay = new Promise<void>((resolve) => timers.push(setTimeout(resolve, think)));
      Promise.all([requestMove(bot.input), delay]).then(([move]) => {
        if (cancelled) return;
        const action: Action = move.type === "call" ? { type: "call", value: move.value } : { type: "play", card: move.card };
        try {
          engine.apply(bot.id, action);
          setView(engine.view());
        } catch (err) {
          // A bot should never make an illegal move; if it does, say so rather than hang.
          setError(err instanceof Error ? `CPU error: ${err.message}` : "CPU error");
        }
      });
    }
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [view, engine]);

  const act = useCallback(
    async (action: Action): Promise<boolean> => {
      try {
        // "Play again" and "end game" both mean: deal a fresh game against the same opponents.
        if (action.type === "reset") engine.restart();
        else engine.apply(HUMAN_ID, action);
        setView(engine.view());
        return true;
      } catch (err) {
        setError(err instanceof GameError ? err.message : "Something went wrong");
        return false;
      }
    },
    [engine],
  );

  const clearError = useCallback(() => setError(null), []);
  const refresh = useCallback(() => {}, []);
  const serverNow = useCallback(() => Date.now(), []);
  const quit = useCallback(() => {
    clearSolo();
    onQuit();
  }, [onQuit]);

  return { view, status: "ready", error, clearError, busy: false, act, refresh, serverNow, solo: { quit } };
}
