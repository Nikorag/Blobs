"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/client/settings";

/** Mirrors settings that CSS needs onto <html>. Renders nothing. */
export function SettingsEffects() {
  const { reducedMotion } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reducedMotion);
  }, [reducedMotion]);
  return null;
}
