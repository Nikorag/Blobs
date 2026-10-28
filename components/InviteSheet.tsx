"use client";

import type { ZontoFriend } from "@zonto/sdk";
import { useEffect, useState } from "react";
import { Sheet } from "./Sheet";
import { useZonto } from "./ZontoProvider";

/** Lists the player's Zonto friends and sends them this table's code as a lobby invite. */
export function InviteSheet({ open, code, onClose }: { open: boolean; code: string; onClose: () => void }) {
  const { client } = useZonto();
  const [friends, setFriends] = useState<ZontoFriend[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    client
      .friends()
      .then((list) => !cancelled && (setFriends(list), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, client]);

  async function invite(friend: ZontoFriend) {
    try {
      await client.sendLobbyInvite(friend.id, code);
      setSent((s) => new Set(s).add(friend.id));
    } catch {
      setFailed(true);
    }
  }

  return (
    <Sheet open={open} title="Invite Zonto friends" onClose={onClose}>
      <div className="space-y-2 pb-2">
        {failed && <p role="alert" className="rounded-xl bg-bad/15 px-3 py-2 text-center text-sm font-semibold text-bad">Couldn&apos;t reach Zonto — try again.</p>}
        {friends === null && !failed && <p className="animate-pulse text-center text-sm text-muted">Loading friends…</p>}
        {friends?.length === 0 && <p className="text-center text-sm text-muted">No Zonto friends yet.</p>}
        {friends?.map((f) => (
          <div key={f.id} className="glass flex items-center gap-3 rounded-2xl p-3">
            <span className={`size-2.5 rounded-full ${f.online ? "bg-good" : "bg-white/20"}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{f.gamertag}</p>
              <p className="truncate text-xs font-semibold text-muted">{f.online ? f.status || "Online" : "Offline"}</p>
            </div>
            <button className="btn btn-ghost !min-h-10 text-sm" disabled={sent.has(f.id)} onClick={() => invite(f)}>
              {sent.has(f.id) ? "Invited ✓" : "Invite"}
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
