import { useSyncExternalStore } from "react";

const KEY = "blobs:settings";

export interface Settings {
  /** Sound effects. */
  sound: boolean;
  /** Vibration on supported devices. */
  haptics: boolean;
  /** Play with reduced motion even if the device doesn't ask for it. */
  reducedMotion: boolean;
  /** Bigger cards in your hand. */
  largeCards: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true, reducedMotion: false, largeCards: false };

/** Merge whatever was stored over the defaults, ignoring anything of the wrong type. */
export function parseSettings(raw: string | null): Settings {
  const out = { ...DEFAULT_SETTINGS };
  if (!raw) return out;
  try {
    const stored = JSON.parse(raw) as Record<string, unknown>;
    for (const k of Object.keys(out) as (keyof Settings)[]) {
      if (typeof stored[k] === "boolean") out[k] = stored[k];
    }
  } catch {
    // ignore: defaults
  }
  return out;
}

const listeners = new Set<() => void>();
let current: Settings | null = null;

export function getSettings(): Settings {
  if (current) return current;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // storage blocked: defaults, kept in memory
  }
  return (current = parseSettings(raw));
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSettings,
    () => DEFAULT_SETTINGS,
  );
}
