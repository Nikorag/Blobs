"use client";

import { useEffect } from "react";
import { play, unlockAudio } from "@/lib/client/audio";

/** Starts audio on the first gesture and gives every `.btn` a click. Renders nothing. */
export function AudioUnlock() {
  useEffect(() => {
    const unlock = () => unlockAudio();
    const click = (e: MouseEvent) => {
      unlockAudio();
      if (e.target instanceof Element && e.target.closest(".btn:not(:disabled)")) play("tap");
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("click", click, true);
    };
  }, []);
  return null;
}
