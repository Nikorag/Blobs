"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { RoundMemory } from "@/lib/ai/types";
import type { Difficulty, Room } from "@/lib/game/types";

const KEY = "blobs:solo";

export interface SoloConfig {
  name: string;
  /** One entry per computer opponent. */
  bots: { name: string; level: Difficulty }[];
}

export interface SoloSave {
  config: SoloConfig;
  room: Room;
  memory: RoundMemory;
}

const listeners = new Set<() => void>();
let cache: string | null | undefined;

function read(): string | null {
  if (cache === undefined) {
    try {
      cache = localStorage.getItem(KEY);
    } catch {
      cache = null;
    }
  }
  return cache;
}

export function writeSolo(save: SoloSave): void {
  cache = JSON.stringify(save);
  try {
    localStorage.setItem(KEY, cache);
  } catch {
    // storage unavailable: the game still works, it just can't be resumed
  }
  listeners.forEach((l) => l());
}

export function clearSolo(): void {
  cache = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

/** The saved CPU game, or null (also during server rendering). */
export function useSoloSave(): SoloSave | null {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SoloSave;
    } catch {
      return null;
    }
  }, [raw]);
}
