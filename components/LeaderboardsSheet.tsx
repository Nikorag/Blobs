"use client";

import { useEffect, useState } from "react";
import type { ZontoLeaderboardResult } from "@zonto/sdk";
import { BOARD_INFO } from "@/lib/zonto/leaderboards";
import { Sheet } from "./Sheet";
import { useZonto } from "./ZontoProvider";

type Scope = "global" | "friends";
type Loaded = { key: string; result: ZontoLeaderboardResult | null; failed: boolean };

export function LeaderboardsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const zonto = useZonto();
  const [boardIdx, setBoardIdx] = useState(0);
  const [scope, setScope] = useState<Scope>("global");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const board = BOARD_INFO[boardIdx];
  const signedIn = zonto.status === "signedIn";
  const key = `${board.slug}:${scope}`;

  useEffect(() => {
    if (!open || !signedIn) return;
    let cancelled = false;
    zonto.client
      .leaderboard(board.slug, { scope, limit: 10 })
      .then((result) => !cancelled && setLoaded({ key, result, failed: false }))
      .catch(() => !cancelled && setLoaded({ key, result: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [open, signedIn, zonto.client, board.slug, scope, key]);

  const current = loaded?.key === key ? loaded : null;
  const result = current?.result ?? null;

  return (
    <Sheet open={open} title="Leaderboards" onClose={onClose}>
      <div className="space-y-3 pb-2">
        {!signedIn ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-muted">Sign in with Zonto to see the boards and get your scores on them.</p>
            <button className="btn btn-primary" onClick={zonto.signIn}>
              Sign in with Zonto
            </button>
          </div>
        ) : (
          <>
            <div role="tablist" aria-label="Board" className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/25 p-1">
              {BOARD_INFO.map((b, i) => (
                <button
                  key={b.slug}
                  role="tab"
                  aria-selected={i === boardIdx}
                  onClick={() => setBoardIdx(i)}
                  className={`rounded-lg py-2 text-sm font-bold ${i === boardIdx ? "bg-accent text-accent-ink" : "text-muted"}`}
                >
                  {b.title}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">{board.blurb}</p>
            <div role="radiogroup" aria-label="Who" className="flex gap-2 text-xs font-bold">
              {(["global", "friends"] as const).map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={scope === s}
                  onClick={() => setScope(s)}
                  className={`rounded-full px-3 py-1.5 ${scope === s ? "bg-white/15 text-ink" : "bg-surface2 text-muted"}`}
                >
                  {s === "global" ? "Everyone" : "Friends"}
                </button>
              ))}
            </div>
            {!current && <p className="animate-pulse py-6 text-center text-sm text-muted">Loading…</p>}
            {current?.failed && <p className="py-6 text-center text-sm text-bad">Couldn&apos;t load the board. Try again later.</p>}
            {result && result.entries.length === 0 && <p className="py-6 text-center text-sm text-muted">No scores yet. Finish a game to be first.</p>}
            {result && result.entries.length > 0 && (
              <ol className="space-y-1.5">
                {result.entries.map((e) => {
                  const me = e.gamertag === zonto.player?.gamertag;
                  return (
                    <li key={`${e.rank}-${e.gamertag}`} className={`glass flex items-center gap-3 rounded-2xl px-3 py-2 ${me ? "border-accent" : ""}`}>
                      <span className="w-6 text-center font-black text-muted">{e.rank}</span>
                      <span className="min-w-0 flex-1 truncate font-bold">{e.gamertag}{me && " (you)"}</span>
                      <span className="text-lg font-black tabular-nums">
                        {e.value}
                        <span className="ml-0.5 text-xs font-bold text-muted">{board.unit}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {result?.myRank != null && <p className="text-center text-sm text-muted">Your best is ranked #{result.myRank}</p>}
          </>
        )}
      </div>
    </Sheet>
  );
}
