import { useMemo, useSyncExternalStore } from "react";
import { randomName } from "@/lib/game/names";

const KEY = "blobs:player";

export interface Identity {
  id: string;
  name: string;
}

export { randomName };

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join("");
}

const listeners = new Set<() => void>();
// Private-mode browsers can't persist, so keep the identity in memory as well.
let memory: string | null = null;

export function saveIdentity(identity: Identity): void {
  memory = JSON.stringify(identity);
  try {
    localStorage.setItem(KEY, memory);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

function readRaw(): string | null {
  if (memory) return memory;
  try {
    memory = localStorage.getItem(KEY);
  } catch {
    // ignore
  }
  if (!memory) saveIdentity({ id: newId(), name: randomName() });
  return memory;
}

/** The device's identity, or null during server rendering / before hydration. */
export function useIdentity(): Identity | null {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readRaw,
    () => null,
  );
  return useMemo(() => (raw ? (JSON.parse(raw) as Identity) : null), [raw]);
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported
  }
}
