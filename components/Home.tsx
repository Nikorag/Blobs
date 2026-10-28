"use client";

import { ZontoAchievementsModal } from "@zonto/sdk/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, createRoom, joinRoom } from "@/lib/client/api";
import { randomName, saveIdentity, useIdentity } from "@/lib/client/identity";
import { Logo } from "./Logo";
import { useCosmetics } from "./CosmeticsProvider";
import { Sheet } from "./Sheet";
import { StoreSheet } from "./StoreSheet";
import { SoloSetup } from "./SoloSetup";
import { useSoloSave } from "@/lib/solo/save";
import { useZonto } from "./ZontoProvider";

export function Home() {
  const router = useRouter();
  const identity = useIdentity();
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? identity?.name ?? "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showSolo, setShowSolo] = useState(false);
  const soloSave = useSoloSave();
  const resumable = soloSave && soloSave.room.phase !== "End" ? soloSave : null;

  const [showAchievements, setShowAchievements] = useState(false);
  const zonto = useZonto();
  const cosmetics = useCosmetics();
  const [showStore, setShowStore] = useState(false);
  const { pendingLobby, clearPendingLobby } = zonto;

  const ready = identity !== null && name.trim().length > 0;

  // Launched from an accepted Zonto lobby invite: skip the menus and take the seat.
  useEffect(() => {
    if (!pendingLobby || !identity) return;
    clearPendingLobby();
    const seat = (zonto.player?.gamertag ?? identity.name).slice(0, 16);
    joinRoom(pendingLobby, identity.id, seat)
      .then((res) => router.push(`/room/${res.code}`))
      .catch((err) =>
        setError(err instanceof ApiError ? (err.status === 404 ? "That invite has expired" : err.message) : "Something went wrong"),
      );
  }, [pendingLobby, identity, clearPendingLobby, zonto.player, router]);

  async function go(kind: "create" | "join") {
    if (!identity || busy) return;
    setBusy(kind);
    setError(null);
    const finalName = name.trim();
    const next = { ...identity, name: finalName };
    saveIdentity(next);
    try {
      const res =
        kind === "create"
          ? await createRoom(next.id, finalName)
          : await joinRoom(code, next.id, finalName);
      router.push(`/room/${res.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 404 ? "No game found with that code" : err.message) : "Something went wrong");
      setBusy(null);
    }
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <Logo />
        <p className="mt-3 max-w-[18rem] text-center text-[0.95rem] text-muted">
          Call your tricks. Win exactly that many. Don&apos;t get blobbed.
        </p>
      </div>

      <div className="glass anim-pop space-y-5 rounded-3xl p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Your name</span>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoComplete="nickname"
              enterKeyHint="done"
              className="h-13 min-w-0 flex-1 rounded-2xl border border-line bg-black/25 px-4 text-lg font-semibold outline-none focus:border-accent"
            />
            <button
              type="button"
              aria-label="Random name"
              onClick={() => setName(randomName())}
              className="btn btn-ghost !min-h-13 !px-4 text-xl"
            >
              🎲
            </button>
          </div>
        </label>

        <button className="btn btn-primary w-full" disabled={!ready || busy !== null} onClick={() => go("create")}>
          {busy === "create" ? "Creating…" : "Create a game"}
        </button>

        <button className="btn btn-ghost w-full" disabled={!ready} onClick={() => setShowSolo(true)}>
          Play vs CPU
        </button>
        {resumable && (
          <Link href="/solo" className="btn btn-ghost w-full !border-accent/40 text-accent">
            Resume game · round {resumable.room.roundNumber}
          </Link>
        )}

        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted">
          <span className="h-px flex-1 bg-line" />
          or join
          <span className="h-px flex-1 bg-line" />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go("join");
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
            placeholder="CODE"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Room code"
            className="h-13 min-w-0 flex-1 rounded-2xl border border-line bg-black/25 px-4 text-center text-xl font-black uppercase tracking-[0.4em] outline-none placeholder:text-white/20 focus:border-accent"
          />
          <button type="submit" className="btn btn-ghost !min-h-13" disabled={!ready || code.length !== 4 || busy !== null}>
            {busy === "join" ? "…" : "Join"}
          </button>
        </form>

        {error && (
          <p role="alert" className="rounded-xl bg-bad/15 px-3 py-2 text-center text-sm font-semibold text-bad">
            {error}
          </p>
        )}
      </div>

      <div className="mx-auto my-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-muted">
        <button onClick={() => setShowRules(true)} className="underline-offset-4 hover:underline">
          How to play
        </button>
        <Link href="/board" className="underline-offset-4 hover:underline">
          Open the Board
        </Link>
        <button onClick={() => setShowStore(true)} className="underline-offset-4 hover:underline">
          Store{cosmetics.status === "ready" && ` · 🪙 ${cosmetics.coins}`}
        </button>
        {zonto.status === "signedIn" && (
          <>
            <button onClick={() => setShowAchievements(true)} className="underline-offset-4 hover:underline">
              Achievements
            </button>
            <button onClick={zonto.signOut} className="underline-offset-4 hover:underline">
              Signed in as {zonto.player?.gamertag} · Sign out
            </button>
          </>
        )}
        {zonto.status === "signedOut" && (
          <button onClick={zonto.signIn} className="text-accent underline-offset-4 hover:underline">
            Sign in with Zonto
          </button>
        )}
      </div>

      <ZontoAchievementsModal client={zonto.client} open={showAchievements} onClose={() => setShowAchievements(false)} />

      {showStore && <StoreSheet open onClose={() => setShowStore(false)} />}

      {showSolo && <SoloSetup open onClose={() => setShowSolo(false)} playerName={name.trim()} />}

      <Sheet open={showRules} title="How to play" onClose={() => setShowRules(false)}>
        <Rules />
      </Sheet>
    </main>
  );
}

export function Rules() {
  return (
    <ol className="space-y-3 text-[0.95rem] leading-snug text-ink/90">
      {[
        ["Deal", "Round one is 7 cards each, then 6, 5… down to a single card. A card is turned up for trumps."],
        ["Call", "Before play, everyone says how many tricks they'll win. The dealer calls last and can't make the total equal the number of tricks, so someone is always wrong."],
        ["Play", "The player after the dealer leads. You must follow suit if you can. Highest card of the led suit wins, but any trump beats it. Winner leads next."],
        ["Score", "Hit your call exactly and you score that number. Miss — over or under — and you're blobbed for −1."],
      ].map(([title, body], i) => (
        <li key={title} className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-accent-ink">{i + 1}</span>
          <p>
            <b>{title}.</b> {body}
          </p>
        </li>
      ))}
    </ol>
  );
}
