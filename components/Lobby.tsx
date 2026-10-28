"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { lockedParts, type Slot } from "@/lib/cosmetics/catalog";
import { saveIdentity } from "@/lib/client/identity";
import { randomName } from "@/lib/client/identity";
import type { RoomView } from "@/lib/game/types";
import type { RoomHandle } from "@/lib/client/roomHandle";
import { Avatar } from "./Avatar";
import { BlobSheet } from "./BlobSheet";
import { useCosmetics } from "./CosmeticsProvider";
import { StoreSheet } from "./StoreSheet";
import { Logo } from "./Logo";
import { QRCode } from "./QRCode";
import { Rules } from "./Home";
import { InviteSheet } from "./InviteSheet";
import { Sheet } from "./Sheet";
import { useZonto } from "./ZontoProvider";

type Room = RoomHandle;

const LEVELS = ["easy", "normal", "hard"] as const;

export function Lobby({ room, view }: { room: Room; view: RoomView }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [designing, setDesigning] = useState(false);
  const [rules, setRules] = useState(false);
  const [qr, setQr] = useState(false);
  const [inviting, setInviting] = useState(false);
  const zonto = useZonto();
  const cosmetics = useCosmetics();
  const [shopSlot, setShopSlot] = useState<Slot | null>(null);
  const restored = useRef(false);
  const me = view.players.find((p) => p.id === view.you)!;
  const isHost = view.hostId === view.you;

  const lastSentCards = useRef<string | null>(null);
  // Put on the blob you designed last time, once your unlocks have loaded.
  const { status: shopStatus, savedLook, isOwned } = cosmetics;
  useEffect(() => {
    if (restored.current || shopStatus !== "ready") return;
    restored.current = true;
    if (!savedLook) return;
    const target = { ...savedLook, cards: cosmetics.cards };
    if (JSON.stringify(target) !== JSON.stringify(me.look) && lockedParts(target, isOwned).length === 0) {
      lastSentCards.current = cosmetics.cards;
      room.act({ type: "look", look: target });
    }
  }, [shopStatus, savedLook, isOwned, me.look, room, cosmetics.cards]);

  // Everyone at the table sees your card style, so keep your seat in step with the one you've equipped.
  useEffect(() => {
    if (shopStatus !== "ready" || cosmetics.cards === me.look.cards || lastSentCards.current === cosmetics.cards) return;
    lastSentCards.current = cosmetics.cards;
    room.act({ type: "look", look: { ...me.look, cards: cosmetics.cards } });
  }, [shopStatus, cosmetics.cards, me.look, room]);
  const allReady = view.players.every((p) => p.isHost || p.ready);
  const canStart = isHost && view.players.length >= 2 && allReady;

  async function share() {
    const url = `${location.origin}/room/${view.code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Join my Blobs game", text: `Join my Blobs game: ${view.code}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // user dismissed the share sheet
    }
  }

  async function leave() {
    await room.act({ type: "leave" });
    router.push("/");
  }

  let hint = "";
  if (view.players.length < 2) hint = "Waiting for friends to join…";
  else if (isHost && !allReady) hint = "Waiting for everyone to get ready…";
  else if (!isHost) hint = me.ready ? "Waiting for the host to start…" : "Tap ready when you're set.";

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      <header className="flex items-center justify-between py-2">
        <Logo compact />
        <button onClick={() => setRules(true)} className="grid size-10 place-items-center rounded-full bg-surface2 font-bold" aria-label="How to play">
          ?
        </button>
      </header>

      <section className="glass anim-pop mt-4 flex flex-col items-center rounded-3xl px-5 py-6">
        <span className="text-xs font-bold uppercase tracking-widest text-muted">Game code</span>
        <span className="my-1 text-6xl font-black tracking-[0.25em] text-accent" aria-label={`Game code ${view.code.split("").join(" ")}`}>
          {view.code}
        </span>
        <button onClick={share} className="btn btn-ghost mt-3 !min-h-11 text-sm">
          {copied ? "Link copied ✓" : "Invite friends"}
        </button>
        {zonto.status === "signedIn" && (
          <button onClick={() => setInviting(true)} className="btn btn-ghost mt-2 !min-h-11 text-sm">
            Invite Zonto friends
          </button>
        )}
        <button onClick={() => setQr(true)} className="mt-2 text-sm font-semibold text-muted underline-offset-4 hover:underline">
          Show QR code
        </button>
      </section>

      <section className="mt-5 flex-1">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Players</h2>
          <span className="text-sm text-muted">{view.players.length}/8</span>
        </div>
        <ul className="space-y-2">
          {view.players.map((p) => (
            <li key={p.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              <Avatar look={p.look} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.name}</p>
                <p className="text-xs font-semibold text-muted">
                  {p.isHost && <span className="text-accent">Host</span>}
                  {p.isHost && p.id === view.you && " · "}
                  {p.id === view.you && "You"}
                </p>
              </div>
              {p.id === view.you && (
                <>
                  <button onClick={() => setDesigning(true)} className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-bold">
                    Blob
                  </button>
                  <button onClick={() => setEditing(true)} className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-bold">
                    Rename
                  </button>
                </>
              )}
              {isHost && p.id !== view.you && (
                <button onClick={() => room.act({ type: "kick", targetId: p.id })} aria-label={`Remove ${p.name}`} className="grid size-8 place-items-center rounded-full bg-bad/15 text-bad">
                  ×
                </button>
              )}
              {p.bot && <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-muted">CPU · {p.bot}</span>}
              {!p.isHost && !p.bot && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.ready ? "bg-good/20 text-good" : "bg-white/8 text-muted"}`}>
                  {p.ready ? "Ready" : "Not ready"}
                </span>
              )}
            </li>
          ))}
        </ul>
        {isHost && view.players.length < 8 && (
          <div className="mt-3 flex items-center gap-2 px-1">
            <span className="text-sm font-semibold text-muted">Add CPU</span>
            {LEVELS.map((level) => (
              <button
                key={level}
                disabled={room.busy}
                onClick={() => room.act({ type: "addBot", level })}
                className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-bold capitalize"
              >
                {level}
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="space-y-3 pt-4">
        {hint && <p className="text-center text-sm text-muted">{hint}</p>}
        {isHost ? (
          <button className="btn btn-primary w-full" disabled={!canStart || room.busy} onClick={() => room.act({ type: "start" })}>
            Start game
          </button>
        ) : (
          <button
            className={`btn w-full ${me.ready ? "btn-ghost" : "btn-primary"}`}
            disabled={room.busy}
            onClick={() => room.act({ type: "ready", ready: !me.ready })}
          >
            {me.ready ? "Not ready" : "I'm ready"}
          </button>
        )}
        <button onClick={leave} className="block w-full py-2 text-center text-sm font-semibold text-muted">
          Leave game
        </button>
      </footer>

      <RenameSheet
        key={editing ? "open" : "closed"}
        open={editing}
        initial={me.name}
        onClose={() => setEditing(false)}
        onSave={async (name) => {
          saveIdentity({ id: view.you, name });
          await room.act({ type: "rename", name });
          setEditing(false);
        }}
      />
      <BlobSheet open={designing} look={me.look} onChange={(look) => {
          cosmetics.rememberLook(look);
          room.act({ type: "look", look });
        }}
        onClose={() => setDesigning(false)}
        onShop={setShopSlot}
      />
      {shopSlot !== null && <StoreSheet open look={me.look} initialSlot={shopSlot} onClose={() => setShopSlot(null)} />}
      <Sheet open={qr} title="Scan to join" onClose={() => setQr(false)}>
        <div className="flex flex-col items-center gap-4 pb-2">
          {qr && <QRCode value={`${location.origin}/room/${view.code}`} label={`QR code to join game ${view.code}`} className="w-64" />}
          <p className="text-center text-sm text-muted">
            Point a friend&apos;s camera at this, or put the table on a big screen with{" "}
            <Link href={`/board/${view.code}`} className="font-semibold text-ink underline underline-offset-4">The Board</Link>.
          </p>
        </div>
      </Sheet>
      <Sheet open={rules} title="How to play" onClose={() => setRules(false)}>
        <Rules />
      </Sheet>
      <InviteSheet open={inviting} code={view.code} onClose={() => setInviting(false)} />
    </main>
  );
}

function RenameSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <Sheet open={open} title="Change name" onClose={onClose}>
      <form
        className="space-y-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim());
        }}
      >
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            aria-label="Name"
            className="h-13 min-w-0 flex-1 rounded-2xl border border-line bg-black/25 px-4 text-lg font-semibold outline-none focus:border-accent"
          />
          <button type="button" aria-label="Random name" onClick={() => setName(randomName())} className="btn btn-ghost !min-h-13 !px-4 text-xl">
            🎲
          </button>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={!name.trim()}>
          Save
        </button>
      </form>
    </Sheet>
  );
}
