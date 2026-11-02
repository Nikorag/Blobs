"use client";

import { useEffect, useState } from "react";
import { SplashCanvas } from "./SplashCanvas";

const KEY = "zonto:studio-splash-at";
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const RUN_MS = 8000; // the animation settles on the title card at ~6.5s
const FADE_MS = 400;

type Phase = "check" | "show" | "fade" | "done";

/**
 * Zonto Games studio splash. Plays when the game is opened, then stays out of the way for
 * two hours. Add `?splash` to any URL to force it.
 */
export function StudioSplash({ children }: { children: React.ReactNode }) {
  // "check" renders the felt colour so a returning player never sees a flash of the app
  // before we've read localStorage.
  const [phase, setPhase] = useState<Phase>("check");

  useEffect(() => {
    const id = setTimeout(decide, 0);
    return () => clearTimeout(id);

    function decide() {
      const force = new URLSearchParams(window.location.search).has("splash");
      let last = 0;
      try {
        last = Number(localStorage.getItem(KEY)) || 0;
      } catch {}
      if (!force && Date.now() - last < COOLDOWN_MS) {
        setPhase("done");
        return;
      }
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {}
      setPhase("show");
    }
  }, []);

  useEffect(() => {
    if (phase !== "show") return;
    const t = setTimeout(() => setPhase("fade"), RUN_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fade") return;
    const t = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <>
      {children}
      {phase !== "done" && (
        <div
          className="fixed inset-0 z-[100] bg-[#1c6b3d] transition-opacity ease-out"
          style={{
            opacity: phase === "fade" ? 0 : 1,
            transitionDuration: `${FADE_MS}ms`,
            // If hydration never happens (JS blocked/failed) the cover removes itself instead of
            // trapping the player on a green screen. It's dropped once we leave "check".
            animation: phase === "check" ? "splash-cover-bail 0s 3s forwards" : undefined,
          }}
          onPointerDown={() => phase === "show" && setPhase("fade")}
        >
          {phase !== "check" && <SplashCanvas />}
        </div>
      )}
    </>
  );
}
