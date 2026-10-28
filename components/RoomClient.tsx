"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, joinRoom } from "@/lib/client/api";
import { type Identity, saveIdentity, useIdentity } from "@/lib/client/identity";
import { useRoom } from "@/lib/client/useRoom";
import { useZontoPlay } from "@/lib/zonto/useZontoPlay";
import { EndScreen } from "./EndScreen";
import { GameScreen } from "./GameScreen";
import { Lobby } from "./Lobby";
import { Logo } from "./Logo";

export function RoomClient({ code }: { code: string }) {
  const identity = useIdentity();

  const room = useRoom(code, identity?.id ?? null);
  const { view, status } = room;
  useZontoPlay(view?.phase === "Call" || view?.phase === "Play" || view?.phase === "Recap");

  if (!identity || (status === "loading" && !view)) return <Splash text="Finding your table…" />;
  if (status === "notFound") {
    return (
      <Message title="Game not found" body={`There's no game with the code ${code}. It may have expired.`}>
        <Link href="/" className="btn btn-primary">Back to start</Link>
      </Message>
    );
  }
  if (status === "needsJoin") {
    return <JoinPrompt code={code} identity={identity} onJoined={() => room.refresh()} />;
  }
  if (!view) {
    return <Splash text={status === "offline" ? "Can't reach the server… retrying" : "Loading…"} />;
  }

  return (
    <>
      {view.phase === "Lobby" && <Lobby room={room} view={view} />}
      {(view.phase === "Call" || view.phase === "Play" || view.phase === "Recap") && <GameScreen room={room} view={view} />}
      {view.phase === "End" && <EndScreen room={room} view={view} />}
      {room.error && (
        <button
          onClick={room.clearError}
          className="anim-pop safe-top fixed inset-x-4 top-0 z-50 mx-auto max-w-md rounded-2xl border border-bad/40 bg-[#2b1233] px-4 py-3 text-left text-sm font-semibold text-bad shadow-xl"
        >
          {room.error}
        </button>
      )}
      {status === "offline" && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-bad py-1 text-center text-xs font-bold text-black">
          Connection lost — retrying…
        </div>
      )}
    </>
  );
}

function Splash({ text }: { text: string }) {
  return (
    <main className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <Logo compact />
        <p className="animate-pulse text-sm text-muted">{text}</p>
      </div>
    </main>
  );
}

function Message({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <main className="safe-top safe-bottom mx-auto grid min-h-dvh max-w-md place-items-center px-5 text-center">
      <div className="space-y-4">
        <Logo compact />
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <p className="text-muted">{body}</p>
        {children}
      </div>
    </main>
  );
}

function JoinPrompt({
  code,
  identity,
  onJoined,
}: {
  code: string;
  identity: Identity;
  onJoined: () => void;
}) {
  const [name, setName] = useState(identity.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const next = { ...identity, name: name.trim() || identity.name };
    saveIdentity(next);
    try {
      await joinRoom(code, next.id, next.name);
      onJoined();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5">
      <Logo />
      <div className="glass space-y-4 rounded-3xl p-5">
        <p className="text-center text-muted">
          Join table <b className="tracking-[0.3em] text-ink">{code}</b>
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          aria-label="Your name"
          className="h-13 w-full rounded-2xl border border-line bg-black/25 px-4 text-lg font-semibold outline-none focus:border-accent"
        />
        <button className="btn btn-primary w-full" onClick={join} disabled={busy || !name.trim()}>
          {busy ? "Joining…" : "Take a seat"}
        </button>
        {error && <p role="alert" className="rounded-xl bg-bad/15 px-3 py-2 text-center text-sm font-semibold text-bad">{error}</p>}
        <Link href="/" className="block text-center text-sm font-semibold text-muted">Back</Link>
      </div>
    </main>
  );
}
