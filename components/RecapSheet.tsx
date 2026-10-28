"use client";

import { useEffect, useState } from "react";
import { RECAP_MS, scoreFor } from "@/lib/game/engine";
import type { RoomHandle } from "@/lib/client/roomHandle";
import type { RoomView } from "@/lib/game/types";
import { Avatar } from "./Avatar";
import { Sheet } from "./Sheet";

type Room = RoomHandle;

export function RecapSheet({ room, view }: { room: Room; view: RoomView }) {
  const open = view.phase === "Recap";
  const result = view.history[view.history.length - 1];
  const { act, serverNow } = room;
  const [now, setNow] = useState(serverNow);
  const iAmReady = view.recapReady.includes(view.you);
  const recapAt = view.recapAt;

  // Count down on the server's clock, then ask for the next round (the server ignores duplicates).
  useEffect(() => {
    if (!open || recapAt === null) return;
    const tick = setInterval(() => setNow(serverNow()), 250);
    const fire = setTimeout(
      () => act({ type: "advance" }),
      Math.max(0, recapAt - serverNow()) + 150 + Math.random() * 400,
    );
    return () => {
      clearInterval(tick);
      clearTimeout(fire);
    };
  }, [open, recapAt, act, serverNow]);

  if (!open || !result) return null;
  const rows = view.players.map((p, i) => ({ p, i, score: scoreFor(result, p.id), called: result.calls[p.id], won: result.tricks[p.id] }));
  const lastRound = result.cards === 1;
  const progress = recapAt === null ? 0 : Math.min(1, 1 - Math.max(0, recapAt - now) / RECAP_MS);

  return (
    <Sheet open title={`Round ${view.history.length} recap`}>
      <ul className="space-y-2">
        {rows.map(({ p, i, score, called, won }) => {
          const blob = score < 0;
          return (
            <li key={p.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${blob ? "border-bad/30 bg-bad/10" : "border-good/30 bg-good/10"}`}>
              <Avatar index={i} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.id === view.you ? "You" : p.name}</p>
                <p className="text-xs text-muted">
                  Called {called} · won {won}
                </p>
              </div>
              <span className={`text-xl font-black tabular-nums ${blob ? "text-bad" : "text-good"}`}>
                {blob ? "BLOB" : `+${score}`}
              </span>
            </li>
          );
        })}
      </ul>
      <button className="btn btn-primary relative mt-4 w-full overflow-hidden" disabled={iAmReady} onClick={() => act({ type: "advance" })}>
        <span className="absolute inset-y-0 left-0 bg-black/15 transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        <span className="relative">
          {iAmReady ? "Waiting for others…" : lastRound ? "See final scores" : "Next round"}
        </span>
      </button>
    </Sheet>
  );
}
