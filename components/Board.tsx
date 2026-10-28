"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SUIT_INFO } from "@/lib/game/cards";
import { useRoom } from "@/lib/client/useRoom";
import type { PlayedCard, PublicPlayer, RoomView } from "@/lib/game/types";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { cardStyleOf, PlayingCard } from "./PlayingCard";
import { QRCode } from "./QRCode";
import { Scoreboard } from "./ScoresSheet";

/** The Board: a read-only, TV-friendly view of a table. It never sends actions. */
export function Board({ code }: { code: string }) {
  const { view, status } = useRoom(code, null, true);
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/room/${code}` : "";

  if (status === "notFound") {
    return (
      <Centered>
        <h2 className="text-4xl font-extrabold">Game not found</h2>
        <p className="text-xl text-muted">There&apos;s no game with the code {code}. It may have expired.</p>
        <Link href="/board" className="btn btn-primary">Try another code</Link>
      </Centered>
    );
  }
  if (!view) {
    return (
      <Centered>
        <p className="animate-pulse text-xl text-muted">{status === "offline" ? "Can't reach the server… retrying" : "Finding the table…"}</p>
      </Centered>
    );
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[120rem] flex-col gap-4 overflow-hidden p-6">
      {view.phase === "Lobby" ? (
        <BoardLobby view={view} joinUrl={joinUrl} />
      ) : view.phase === "End" ? (
        <BoardEnd view={view} />
      ) : (
        <BoardGame view={view} />
      )}
      {status === "offline" && (
        <div className="fixed inset-x-0 bottom-0 bg-bad py-1 text-center text-sm font-bold text-black">Connection lost — retrying…</div>
      )}
    </main>
  );
}

const noopSubscribe = () => () => {};

/** The site origin, or "" during server rendering. */
function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => location.origin, () => "");
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-5">
        <Logo compact />
        {children}
      </div>
    </main>
  );
}

function BoardLobby({ view, joinUrl }: { view: RoomView; joinUrl: string }) {
  return (
    <>
      <header className="flex items-center justify-between">
        <Logo compact />
        <span className="text-lg font-bold uppercase tracking-widest text-muted">The Board</span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="glass anim-pop flex flex-col items-center justify-center gap-5 rounded-[2rem] p-8">
          <p className="text-xl font-bold uppercase tracking-widest text-muted">Scan to join</p>
          {joinUrl && <QRCode value={joinUrl} label={`QR code to join game ${view.code}`} className="w-[min(28rem,45dvh)]" />}
          <p className="text-xl text-muted">or enter code</p>
          <p className="text-[clamp(4rem,12dvh,9rem)] font-black leading-none tracking-[0.25em] text-accent">{view.code}</p>
        </section>
        <section className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-xl font-bold uppercase tracking-wider text-muted">Players</h2>
            <span className="text-xl text-muted">{view.players.length}/8</span>
          </div>
          <ul className="grid flex-1 content-start gap-3 overflow-hidden">
            {view.players.map((p) => (
              <li key={p.id} className="glass anim-pop flex items-center gap-4 rounded-2xl p-4">
                <Avatar look={p.look} size="lg" />
                <span className="min-w-0 flex-1 truncate text-3xl font-extrabold">{p.name}</span>
                {p.isHost ? (
                  <span className="text-lg font-bold text-accent">Host</span>
                ) : (
                  <span className={`rounded-full px-4 py-1.5 text-lg font-bold ${p.ready ? "bg-good/20 text-good" : "bg-white/8 text-muted"}`}>
                    {p.ready ? "Ready" : "Not ready"}
                  </span>
                )}
              </li>
            ))}
            {view.players.length === 0 && <p className="text-2xl text-muted">Waiting for players…</p>}
          </ul>
        </section>
      </div>
    </>
  );
}

function BoardGame({ view }: { view: RoomView }) {
  const nameOf = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? "Someone";
  const showingLast = view.trick.length === 0 && view.lastTrick;
  const tableCards: PlayedCard[] = showingLast ? view.lastTrick!.cards : view.trick;
  const winnerId = showingLast ? view.lastTrick!.winnerId : null;
  const trump = view.trump;

  let status: string;
  if (view.phase === "Recap") status = "Round complete";
  else if (view.phase === "Call") status = `${nameOf(view.turnId)} is calling…`;
  else if (showingLast) status = `${nameOf(winnerId)} won the trick`;
  else status = view.trick.length === 0 ? `${nameOf(view.turnId)} leads` : `Waiting for ${nameOf(view.turnId)}…`;

  return (
    <>
      <header className="flex items-center gap-6">
        <Logo compact />
        <div className="flex-1 leading-tight">
          <p className="text-lg font-bold uppercase tracking-widest text-muted">
            Round {view.roundNumber}/{view.totalRounds}
          </p>
          <p className="text-3xl font-extrabold">
            {view.cardsThisRound} {view.cardsThisRound === 1 ? "card" : "cards"}
          </p>
        </div>
        {trump && (
          <div className="glass flex items-center gap-3 rounded-2xl py-2 pl-4 pr-2" aria-label={`Trumps are ${SUIT_INFO[trump.suit].name}`}>
            <span className="text-lg font-bold uppercase tracking-widest text-muted">Trump</span>
            <PlayingCard card={trump} size="lg" styleId={cardStyleOf(view, view.dealerId, "classic")} />
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
        <ol className="flex min-h-0 flex-col gap-3 overflow-hidden" aria-label="Players">
          {view.players.map((p) => (
            <BoardPlayer key={p.id} player={p} turn={view.turnId === p.id} dealer={view.dealerId === p.id} phase={view.phase} />
          ))}
        </ol>

        <section className="felt relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-[2rem] px-6">
          <p aria-live="polite" className="absolute inset-x-0 top-5 text-center text-3xl font-bold text-white/85">
            {status}
          </p>
          {view.phase === "Recap" ? (
            <div className="w-full max-w-3xl pt-12">
              <Scoreboard view={view} />
            </div>
          ) : (
            <div className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-8 pt-12">
              {tableCards.length === 0 && (
                <p className="text-2xl text-white/40">{view.phase === "Call" ? "Calls are made in turn" : "The table is empty"}</p>
              )}
              {tableCards.map((pc, i) => {
                const winner = winnerId === pc.playerId;
                return (
                  <div key={`${pc.card.rank}${pc.card.suit}`} className={`flex flex-col items-center gap-2 ${showingLast && !winner ? "opacity-55" : ""}`}>
                    <div className="origin-top scale-[1.6]">
                      <PlayingCard
                        card={pc.card}
                        styleId={cardStyleOf(view, pc.playerId, "classic")}
                        size="lg"
                        className={`anim-card-in ${winner ? "ring-4 ring-accent" : ""}`}
                        style={{ "--tilt": `${((i * 37) % 9) - 4}deg` } as React.CSSProperties}
                      />
                    </div>
                    <span className={`mt-[4.5rem] max-w-40 truncate text-2xl font-bold ${winner ? "text-accent" : "text-white/85"}`}>
                      {nameOf(pc.playerId)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function BoardPlayer({ player, turn, dealer, phase }: { player: PublicPlayer; turn: boolean; dealer: boolean; phase: string }) {
  const playing = phase === "Play";
  let tally = "—";
  let cls = "bg-white/10 text-white/60";
  if (player.call !== null) {
    tally = playing || phase === "Recap" ? `${player.tricks}/${player.call}` : `${player.call}`;
    cls = !playing || player.tricks < player.call ? "bg-accent/20 text-accent" : player.tricks === player.call ? "bg-good/20 text-good" : "bg-bad/20 text-bad";
  }
  return (
    <li
      className={`glass flex min-h-0 flex-1 items-center gap-4 rounded-2xl px-4 ${turn ? "anim-ring" : ""}`}
      style={turn ? { borderColor: "var(--accent)" } : undefined}
    >
      <Avatar look={player.look} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-2xl font-extrabold">
          {player.name}
          {dealer && <span className="ml-2 rounded-full bg-white px-2 py-0.5 align-middle text-sm font-black text-black">D</span>}
        </p>
        <p className="text-lg font-semibold text-muted">{player.total} pts · 🂠{player.handCount}</p>
      </div>
      <span className={`rounded-full px-4 py-1 text-3xl font-black tabular-nums ${cls}`}>{tally}</span>
    </li>
  );
}

function BoardEnd({ view }: { view: RoomView }) {
  const ranked = view.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.total - a.p.total);
  const best = ranked[0]?.p.total ?? 0;
  const winners = ranked.filter((r) => r.p.total === best);
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-2">
      <section className="anim-pop flex flex-col items-center justify-center text-center">
        <span className="text-8xl" aria-hidden>🏆</span>
        <p className="mt-4 text-xl font-bold uppercase tracking-widest text-muted">{winners.length > 1 ? "It's a tie" : "Winner"}</p>
        <h1 className="mt-2 text-7xl font-black text-accent">{winners.map((w) => w.p.name).join(" & ")}</h1>
        <p className="mt-2 text-2xl text-muted">with {best} points</p>
      </section>
      <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <ol className="space-y-2">
          {ranked.map(({ p }, pos) => (
            <li key={p.id} className="glass flex items-center gap-4 rounded-2xl p-3">
              <span className="w-8 text-center text-2xl font-black text-muted">{pos + 1}</span>
              <Avatar look={p.look} />
              <span className="min-w-0 flex-1 truncate text-2xl font-bold">{p.name}</span>
              <span className="text-3xl font-black tabular-nums">{p.total}</span>
            </li>
          ))}
        </ol>
        <div className="glass min-h-0 flex-1 overflow-auto rounded-2xl p-4">
          <Scoreboard view={view} />
        </div>
      </section>
    </div>
  );
}
