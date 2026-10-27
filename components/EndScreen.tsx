"use client";

import { useEffect } from "react";
import { vibrate } from "@/lib/client/identity";
import type { useRoom } from "@/lib/client/useRoom";
import type { RoomView } from "@/lib/game/types";
import { Avatar } from "./Avatar";
import { Scoreboard } from "./ScoresSheet";

type Room = ReturnType<typeof useRoom>;

export function EndScreen({ room, view }: { room: Room; view: RoomView }) {
  const ranked = view.players
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.total - a.p.total);
  const best = ranked[0].p.total;
  const winners = ranked.filter((r) => r.p.total === best);
  const iWon = winners.some((w) => w.p.id === view.you);
  const isHost = view.hostId === view.you;

  useEffect(() => {
    if (iWon) vibrate([100, 50, 100, 50, 300]);
  }, [iWon]);

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      <section className="anim-pop flex flex-col items-center pb-6 pt-8 text-center">
        <span className="text-6xl" aria-hidden>🏆</span>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted">{winners.length > 1 ? "It's a tie" : "Winner"}</p>
        <h1 className="mt-1 text-4xl font-black text-accent">{winners.map((w) => (w.p.id === view.you ? "You" : w.p.name)).join(" & ")}</h1>
        <p className="mt-1 text-muted">with {best} points</p>
      </section>

      <ol className="space-y-2">
        {ranked.map(({ p, i }, pos) => (
          <li key={p.id} className="glass flex items-center gap-3 rounded-2xl p-3">
            <span className="w-6 text-center font-black text-muted">{pos + 1}</span>
            <Avatar name={p.name} index={i} />
            <span className="min-w-0 flex-1 truncate font-bold">{p.id === view.you ? `${p.name} (you)` : p.name}</span>
            <span className="text-xl font-black tabular-nums">{p.total}</span>
          </li>
        ))}
      </ol>

      <details className="glass mt-4 rounded-2xl p-4">
        <summary className="cursor-pointer text-sm font-bold">Round by round</summary>
        <div className="mt-3">
          <Scoreboard view={view} />
        </div>
      </details>

      <div className="mt-auto space-y-3 pt-6">
        {isHost ? (
          <button className="btn btn-primary w-full" disabled={room.busy} onClick={() => room.act({ type: "reset" })}>
            Play again
          </button>
        ) : (
          <p className="text-center text-sm text-muted">Waiting for the host to start another game…</p>
        )}
      </div>
    </main>
  );
}
