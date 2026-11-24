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

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Parse a stored save, or null if it isn't a usable CPU game. The shape is checked well enough
 * that a damaged or out-of-date save can't crash the screens that read it.
 */
export function parseSave(raw: string): SoloSave | null {
  try {
    const save = JSON.parse(raw) as unknown;
    if (!isObject(save) || !isObject(save.config) || !isObject(save.room) || !isObject(save.memory)) return null;
    const { config, room } = save;
    if (typeof config.name !== "string" || !Array.isArray(config.bots)) return null;
    if (typeof room.phase !== "string" || typeof room.hostId !== "string" || typeof room.code !== "string") return null;
    if (!Array.isArray(room.players) || room.players.length < 2) return null;
    const seatsOk = room.players.every((p) => isObject(p) && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.hand));
    if (!seatsOk) return null;
    if (!Array.isArray(room.history) || !Array.isArray(room.trick) || !isObject(room.calls) || !isObject(room.tricks)) return null;
    for (const n of ["turnIdx", "dealerIdx", "cardsThisRound", "roundNumber", "startingCards"] as const) {
      if (typeof room[n] !== "number") return null;
    }
    return save as unknown as SoloSave;
  } catch {
    return null;
  }
}

function useRawSave(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
}

/** The saved CPU game, or null (also during server rendering, or if the save is unusable). */
export function useSoloSave(): SoloSave | null {
  const raw = useRawSave();
  return useMemo(() => (raw ? parseSave(raw) : null), [raw]);
}

/** True if something is stored under the save key but it can't be used. */
export function useSoloSaveBroken(): boolean {
  const raw = useRawSave();
  return useMemo(() => !!raw && parseSave(raw) === null, [raw]);
}
