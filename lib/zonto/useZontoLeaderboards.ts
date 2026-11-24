"use client";

import { useEffect } from "react";
import { useZonto } from "@/components/ZontoProvider";
import type { RoomView } from "@/lib/game/types";
import { gameFingerprint, scoresFor } from "./leaderboards";

const KEY = "blobs:lb-sent";
const KEEP = 30;

function sentList(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function remember(fingerprint: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...sentList(), fingerprint].slice(-KEEP)));
  } catch {
    // storage blocked: worst case a reload re-sends, and the platform only keeps a better score
  }
}

/**
 * Submits the viewing player's result to the Zonto leaderboards when a game finishes: once per
 * game (a fingerprint is remembered across reloads), signed-in players only. Never throws into play.
 */
export function useZontoLeaderboards(view: RoomView | null): void {
  const { client, status } = useZonto();
  const ended = view?.phase === "End";
  const fingerprint = view && ended ? gameFingerprint(view) : null;

  useEffect(() => {
    if (status !== "signedIn" || !view || !fingerprint) return;
    if (sentList().includes(fingerprint)) return;
    const subs = scoresFor(view);
    remember(fingerprint);
    Promise.all(subs.map((s) => client.submitScore(s.value, s.board))).catch(() => {
      // Let a later visit to the end screen try again.
      try {
        localStorage.setItem(KEY, JSON.stringify(sentList().filter((f) => f !== fingerprint)));
      } catch {
        // ignore
      }
    });
    // `view` changes every poll; the fingerprint says whether this is a new finished game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, status, fingerprint]);
}
