"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, createRoom, joinRoom } from "@/lib/client/api";
import { randomName, saveIdentity, useIdentity } from "@/lib/client/identity";
import { Logo } from "./Logo";
import { Sheet } from "./Sheet";

export function Home() {
  const router = useRouter();
  const identity = useIdentity();
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? identity?.name ?? "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const ready = identity !== null && name.trim().length > 0;

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

      <button onClick={() => setShowRules(true)} className="mx-auto my-5 text-sm font-semibold text-muted underline-offset-4 hover:underline">
        How to play
      </button>

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
