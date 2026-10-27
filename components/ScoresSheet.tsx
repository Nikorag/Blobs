"use client";

import { scoreFor } from "@/lib/game/engine";
import type { RoomView } from "@/lib/game/types";
import { Avatar } from "./Avatar";
import { Sheet } from "./Sheet";

export function ScoresSheet({ open, onClose, view }: { open: boolean; onClose: () => void; view: RoomView }) {
  return (
    <Sheet open={open} title="Scores" onClose={onClose}>
      <Scoreboard view={view} />
    </Sheet>
  );
}

export function Scoreboard({ view }: { view: RoomView }) {
  const inProgress = view.phase === "Call" || view.phase === "Play";
  return (
    <div className="no-scrollbar overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1 text-center text-sm">
        <thead>
          <tr>
            <th className="pb-1 text-left text-xs font-bold uppercase tracking-wider text-muted">Cards</th>
            {view.players.map((p, i) => (
              <th key={p.id} className="px-1 pb-1">
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={p.name} index={i} size="sm" />
                  <span className="max-w-16 truncate text-xs font-bold">{p.id === view.you ? "You" : p.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.history.map((r, idx) => (
            <tr key={idx} className="bg-surface">
              <td className="rounded-l-lg py-2 pl-2 text-left font-bold text-muted">{r.cards}</td>
              {view.players.map((p, i) => {
                const s = scoreFor(r, p.id);
                return (
                  <td key={p.id} className={`py-2 font-bold tabular-nums ${s < 0 ? "text-bad" : "text-good"} ${i === view.players.length - 1 ? "rounded-r-lg" : ""}`}>
                    {s < 0 ? "BLOB" : s}
                  </td>
                );
              })}
            </tr>
          ))}
          {inProgress && (
            <tr className="bg-accent/10">
              <td className="rounded-l-lg py-2 pl-2 text-left font-bold text-accent">{view.cardsThisRound}</td>
              {view.players.map((p, i) => (
                <td key={p.id} className={`py-2 font-bold tabular-nums text-accent ${i === view.players.length - 1 ? "rounded-r-lg" : ""}`}>
                  {p.call === null ? "…" : view.phase === "Play" ? `${p.tricks}/${p.call}` : p.call}
                </td>
              ))}
            </tr>
          )}
          <tr>
            <td className="pt-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Total</td>
            {view.players.map((p) => (
              <td key={p.id} className="pt-3 text-lg font-black tabular-nums">
                {p.total}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {view.history.length === 0 && !inProgress && <p className="py-4 text-center text-sm text-muted">No rounds played yet.</p>}
    </div>
  );
}
