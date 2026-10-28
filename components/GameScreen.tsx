"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { sameCard } from "@/lib/game/cards";
import { vibrate } from "@/lib/client/identity";
import type { RoomHandle } from "@/lib/client/roomHandle";
import type { Card, PlayedCard, PublicPlayer, RoomView } from "@/lib/game/types";
import { Avatar } from "./Avatar";
import { useCosmetics } from "./CosmeticsProvider";
import { EmoteBubble, EmotePicker } from "./Emote";
import { cardStyleOf, cardTilt, PlayingCard } from "./PlayingCard";
import { RecapSheet } from "./RecapSheet";
import { ScoresSheet } from "./ScoresSheet";
import { Sheet } from "./Sheet";
import { SUIT_INFO } from "@/lib/game/cards";

type Room = RoomHandle;

/** How long the trump card holds in the middle of the table, and how long it takes to fly to the header. */
const TRUMP_SHOW_MS = 1800;
const TRUMP_FLY_MS = 600;

export function GameScreen({ room, view }: { room: Room; view: RoomView }) {
  const cosmetics = useCosmetics();
  const [scoresOpen, setScoresOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tapped, setTapped] = useState<Card | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  // Trick resolution: hold the finished trick on the table with a winner call-out, then sweep it to the winner.
  const [stage, setStage] = useState<"show" | "sweep" | "done">("done");
  const [sweepTo, setSweepTo] = useState<Record<string, { dx: number; dy: number }>>({});
  const targetRefs = useRef(new Map<string, HTMLElement>());
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const meIdx = view.players.findIndex((p) => p.id === view.you);
  const me = view.players[meIdx];
  const myTurn = view.turnId === view.you;
  const nameOf = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? "Someone";

  // Opponents in seating order, starting with whoever sits after me.
  const opponents = useMemo(
    () => view.players.map((p, i) => ({ p, i })).filter(({ p }) => p.id !== view.you).sort((a, b) => ((a.i - meIdx + view.players.length) % view.players.length) - ((b.i - meIdx + view.players.length) % view.players.length)),
    [view.players, view.you, meIdx],
  );

  // Buzz + banner when the turn passes to me.
  const wasMyTurn = useRef(false);
  useEffect(() => {
    if (myTurn && !wasMyTurn.current) {
      vibrate([180, 60, 180]);
      setBanner(view.phase === "Call" ? "Your call!" : "Your turn!");
      const t = setTimeout(() => setBanner(null), 2600);
      wasMyTurn.current = true;
      return () => clearTimeout(t);
    }
    if (!myTurn) wasMyTurn.current = false;
  }, [myTurn, view.phase]);

  useEffect(() => {
    if (!myTurn) {
      document.title = "Blobs";
      return;
    }
    document.title = "🔔 Your turn · Blobs";
    return () => {
      document.title = "Blobs";
    };
  }, [myTurn]);

  const trickKey = view.lastTrick ? `${view.roundNumber}:${view.lastTrick.cards.map((c) => `${c.card.rank}${c.card.suit}`).join(",")}` : null;
  const seenTrick = useRef(trickKey);
  useEffect(() => {
    if (!trickKey || trickKey === seenTrick.current) return;
    seenTrick.current = trickKey;
    const winnerId = view.lastTrick!.winnerId;
    setStage("show");
    setSweepTo({});
    const t1 = setTimeout(() => {
      const target = targetRefs.current.get(winnerId)?.getBoundingClientRect();
      const next: Record<string, { dx: number; dy: number }> = {};
      for (const pc of view.lastTrick!.cards) {
        const r = cardRefs.current.get(pc.playerId)?.getBoundingClientRect();
        if (!r || !target) continue;
        // Aim for the winner's chip, but keep the card on screen if the chip is scrolled out of view.
        const tx = Math.min(Math.max(target.left + target.width / 2, 24), window.innerWidth - 24);
        next[pc.playerId] = { dx: tx - (r.left + r.width / 2), dy: target.top + target.height / 2 - (r.top + r.height / 2) };
      }
      setSweepTo(next);
      setStage("sweep");
      vibrate(winnerId === view.you ? [30, 40, 30] : 12);
    }, 1600);
    const t2 = setTimeout(() => setStage("done"), 1600 + 550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // Only a new trick restarts the sequence; later view updates must not cancel it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trickKey]);

  // The raised card. Tapping lifts it, tapping again plays it. If only one card is legal it's pre-raised.
  const canPlay = myTurn && view.phase === "Play";
  const selected =
    canPlay && tapped && view.playable.some((c) => sameCard(c, tapped))
      ? tapped
      : canPlay && view.playable.length === 1
        ? view.playable[0]
        : null;

  const showingLast = view.trick.length === 0 && view.lastTrick && stage !== "done";
  const tableCards: PlayedCard[] = showingLast ? view.lastTrick!.cards : view.trick;
  const winnerId = showingLast ? view.lastTrick!.winnerId : null;
  const winnerIdx = view.players.findIndex((p) => p.id === winnerId);
  // Whoever is about to receive the trick gulps it down as the cards arrive.
  const gulpId = showingLast && stage === "sweep" ? winnerId : null;

  let status: string;
  if (view.phase === "Recap") status = "Round complete";
  else if (view.phase === "Call") status = myTurn ? "How many tricks will you win?" : `${nameOf(view.turnId)} is calling…`;
  else if (myTurn) status = view.trick.length === 0 ? "Your lead — play any card" : "Your turn";
  else status = `Waiting for ${nameOf(view.turnId)}…`;

  async function play(card: Card) {
    if (!canPlay) return;
    if (!view.playable.some((c) => sameCard(c, card))) return;
    if (!selected || !sameCard(selected, card)) {
      setTapped(card);
      vibrate(8);
      return;
    }
    setTapped(null);
    await room.act({ type: "play", card });
  }

  const trump = view.trump;
  const trumpInfo = trump ? SUIT_INFO[trump.suit] : null;
  const trumpStyle = cardStyleOf(view, view.dealerId, cosmetics.cards);

  // Each round the trump card is shown big in the middle ("Trumps are Clubs"), then flies to its spot in the header.
  const revealKey = trump ? `${view.roundNumber}:${trump.rank}${trump.suit}` : null;
  // Joining mid-round shouldn't replay the reveal; arriving at the start of one should.
  const [skipKey] = useState(() => (view.phase === "Call" && view.players.every((p) => p.call === null) ? null : revealKey));
  const [revealed, setRevealed] = useState<string | null>(null);
  const [flight, setFlight] = useState<{ dx: number; dy: number; scale: number } | null>(null);
  const bigTrumpRef = useRef<HTMLDivElement>(null);
  const headerTrumpRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const revealing = revealKey !== null && revealed !== revealKey && !reducedMotion && revealKey !== skipKey;

  useEffect(() => {
    if (!revealing) return;
    const key = revealKey;
    const t1 = setTimeout(() => {
      const from = bigTrumpRef.current;
      const to = headerTrumpRef.current?.getBoundingClientRect();
      if (!from || !to) return setRevealed(key);
      const a = from.getBoundingClientRect();
      setFlight({
        dx: to.left + to.width / 2 - (a.left + a.width / 2),
        dy: to.top + to.height / 2 - (a.top + a.height / 2),
        scale: to.width / from.offsetWidth,
      });
    }, TRUMP_SHOW_MS);
    const t2 = setTimeout(() => {
      setRevealed(key);
      setFlight(null);
    }, TRUMP_SHOW_MS + TRUMP_FLY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // `revealing` flips off as soon as the reveal ends; only a new round's key should restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      {banner && (
        <div className="anim-banner pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-4 safe-top">
          <div className="rounded-full bg-accent px-5 py-2 text-sm font-black text-accent-ink shadow-xl">{banner}</div>
        </div>
      )}

      {revealing && trump && trumpInfo && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-30 grid place-items-center">
          <div className={`absolute inset-0 bg-black/50 transition-opacity duration-500 ${flight ? "opacity-0" : "anim-fade"}`} />
          <div className="relative flex flex-col items-center">
            <div className="anim-pop mb-16 mt-12">
              <div
                ref={bigTrumpRef}
                style={{
                  transform: flight ? `translate(${flight.dx}px, ${flight.dy}px) scale(${flight.scale})` : "scale(2.2)",
                  transition: `transform ${TRUMP_FLY_MS}ms cubic-bezier(0.5, 0, 0.2, 1)`,
                }}
              >
                <PlayingCard card={trump} size="lg" minimal styleId={trumpStyle} />
              </div>
            </div>
            <p className={`text-center text-3xl font-black transition-opacity duration-300 ${flight ? "opacity-0" : "anim-pop"}`}>
              Trumps are {trumpInfo.name} {trumpInfo.symbol}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="safe-top flex items-center gap-3 px-4 pb-2">
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" className="grid size-10 place-items-center rounded-full bg-surface2 text-lg">
          ☰
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
            Round {view.roundNumber}/{view.totalRounds}
          </p>
          <p className="truncate text-base font-extrabold">
            {view.cardsThisRound} {view.cardsThisRound === 1 ? "card" : "cards"}
          </p>
        </div>
        {trump && trumpInfo && (
          <div className="glass flex items-center gap-2 rounded-xl py-1 pl-2.5 pr-1" aria-label={`Trumps are ${trumpInfo.name}`}>
            <span className="text-[0.6rem] font-bold uppercase leading-none tracking-widest text-muted">Trump</span>
            <span ref={headerTrumpRef} className={`inline-flex ${revealing ? "invisible" : ""}`}>
              <PlayingCard card={trump} size="sm" minimal styleId={trumpStyle} />
            </span>
          </div>
        )}
        <button onClick={() => setScoresOpen(true)} aria-label="Scores" className="grid size-10 place-items-center rounded-full bg-surface2 text-lg">
          🏆
        </button>
      </header>

      {/* Opponents */}
      <section className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-4" aria-label="Players">
        {opponents.map(({ p }) => (
          <PlayerChip
            key={p.id}
            ref={(el) => {
              if (el) targetRefs.current.set(p.id, el);
              else targetRefs.current.delete(p.id);
            }}
            player={p}
            serverNow={view.serverNow}
            turn={view.turnId === p.id}
            dealer={view.dealerId === p.id}
            phase={view.phase}
            gulp={gulpId === p.id}
          />
        ))}
      </section>

      {/* Table */}
      <section className="felt relative z-20 mx-4 flex min-h-0 flex-1 flex-col items-center justify-center rounded-[2.5rem] px-3">
        <p
          aria-live="polite"
          className={`absolute inset-x-0 top-3 text-center text-sm font-bold ${myTurn ? "text-accent" : "text-white/70"}`}
        >
          {status}
        </p>

        {view.phase === "Call" && myTurn ? (
          <CallPicker view={view} busy={room.busy} onCall={(value) => room.act({ type: "call", value })} />
        ) : (
          <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-4 pt-6">
            {tableCards.length === 0 && view.phase !== "Recap" && (
              <p className="text-center text-sm text-white/40">
                {view.phase === "Call" ? "Calls are made in turn" : "The table is empty"}
              </p>
            )}
            {tableCards.map((pc) => {
              const winner = winnerId === pc.playerId;
              const sweeping = showingLast && stage === "sweep";
              const to = sweepTo[pc.playerId];
              return (
                <div
                  key={`${pc.card.rank}${pc.card.suit}`}
                  ref={(el) => {
                    if (el) cardRefs.current.set(pc.playerId, el);
                    else cardRefs.current.delete(pc.playerId);
                  }}
                  style={sweeping && to ? ({ "--dx": `${to.dx}px`, "--dy": `${to.dy}px` } as React.CSSProperties) : undefined}
                  className={`flex flex-col items-center gap-1.5 ${sweeping ? "anim-sweep" : ""} ${showingLast && !winner && !sweeping ? "opacity-55" : ""}`}
                >
                  <PlayingCard
                    card={pc.card}
                    styleId={cardStyleOf(view, pc.playerId, cosmetics.cards)}
                    size={tableCards.length > 5 ? "md" : "lg"}
                    className={`anim-card-in ${winner ? "ring-4 ring-accent" : ""}`}
                    style={cardTilt(pc.card)}
                  />
                  <span className={`max-w-16 truncate text-xs font-bold ${winner ? "text-accent" : "text-white/80"}`}>
                    {pc.playerId === view.you ? "You" : nameOf(pc.playerId)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {showingLast && stage === "show" && (
          <div className="anim-pop pointer-events-none absolute inset-0 z-10 grid place-items-center px-4">
            <div className="jelly-banner flex max-w-full items-center gap-3 rounded-[1.75rem] py-2.5 pl-3 pr-5">
              <Avatar look={view.players[Math.max(winnerIdx, 0)]?.look} size="md" className="anim-jiggle" />
              <p className="min-w-0 truncate text-xl font-bold leading-tight">
                {winnerId === view.you ? "You win the trick!" : `${nameOf(winnerId)} wins the trick!`}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* My status + hand */}
      <section className="safe-bottom pt-3">
        <div className="mb-2 flex items-center justify-between px-5">
          <div
            ref={(el) => {
              if (el) targetRefs.current.set(view.you, el);
              else targetRefs.current.delete(view.you);
            }}
            className={`flex items-center gap-2 ${gulpId === view.you ? "anim-gulp" : ""}`}
          >
            <div className="relative">
              <Avatar look={me.look} size="sm" />
              <EmoteBubble emote={me.emote} serverNow={view.serverNow} className="-top-9 left-0" />
            </div>
            <span className="text-sm font-bold">You</span>
            {view.dealerId === view.you && <DealerBadge />}
            {!room.solo && <EmotePicker onPick={(emote) => room.act({ type: "emote", emote })} />}
          </div>
          <MyScore player={me} phase={view.phase} />
        </div>
        <Hand
          cards={view.myHand}
          playable={view.playable}
          selected={selected}
          myTurn={myTurn && view.phase === "Play"}
          onTap={play}
          disabled={room.busy}
        />
      </section>

      <RecapSheet room={room} view={view} />
      <ScoresSheet open={scoresOpen} onClose={() => setScoresOpen(false)} view={view} />
      <Sheet open={menuOpen} title="Game" onClose={() => setMenuOpen(false)}>
        <div className="space-y-3 pb-2">
          {!room.solo && (
            <p className="text-sm text-muted">
              Game code <b className="tracking-[0.3em] text-ink">{view.code}</b>
            </p>
          )}
          {room.solo ? (
            <button
              className="btn btn-danger w-full"
              onClick={() => {
                if (confirm("Quit this game? Your progress will be lost.")) room.solo!.quit();
              }}
            >
              Quit game
            </button>
          ) : view.hostId === view.you ? (
            <button
              className="btn btn-danger w-full"
              onClick={async () => {
                if (confirm("End this game and return everyone to the lobby?")) {
                  setMenuOpen(false);
                  await room.act({ type: "reset" });
                }
              }}
            >
              End game for everyone
            </button>
          ) : (
            <p className="text-sm text-muted">Only the host can end the game.</p>
          )}
        </div>
      </Sheet>
    </main>
  );
}

function DealerBadge() {
  return (
    <span title="Dealer" className="grid size-5 place-items-center rounded-full bg-white text-[0.65rem] font-black text-black">
      D
    </span>
  );
}

function tally(player: { call: number | null; tricks: number }, phase: string) {
  if (player.call === null) return { text: "—", cls: "bg-white/10 text-white/60", glow: "#9ea7de" };
  const playing = phase === "Play";
  const [cls, glow] =
    !playing || player.tricks < player.call
      ? ["bg-accent/15", "var(--accent)"]
      : player.tricks === player.call
        ? ["bg-good/15", "var(--good)"]
        : ["bg-bad/15", "var(--bad)"];
  return { text: playing || phase === "Recap" ? `${player.tricks}/${player.call}` : `${player.call}`, cls, glow };
}

function PlayerChip({ player, serverNow, turn, dealer, phase, gulp, ref }: { player: PublicPlayer; serverNow: number; turn: boolean; dealer: boolean; phase: string; gulp: boolean; ref?: React.Ref<HTMLDivElement> }) {
  const t = tally(player, phase);
  return (
    <div
      ref={ref}
      className={`glass relative flex min-w-[5.25rem] flex-1 flex-col items-center gap-1 rounded-2xl px-2 pb-2 pt-2.5 ${turn ? "anim-ring border-accent" : ""} ${gulp ? "anim-gulp" : ""}`}
      style={turn ? { borderColor: "var(--accent)" } : undefined}
    >
      <div className="relative">
        <Avatar look={player.look} />
        <EmoteBubble emote={player.emote} serverNow={serverNow} className="-left-3 -top-2" />
        {dealer && (
          <span className="absolute -right-1 -top-1">
            <DealerBadge />
          </span>
        )}
      </div>
      <p className="max-w-full truncate text-xs font-bold">{player.name}</p>
      {player.bot && (
        <span className="-mt-0.5 rounded-full bg-white/10 px-1.5 text-[0.55rem] font-black uppercase tracking-wider text-muted">
          CPU · {player.bot}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <span style={{ "--glow": t.glow } as React.CSSProperties} className={`glow-num rounded-full px-2 py-0.5 text-sm tabular-nums ${t.cls}`}>
          {t.text}
        </span>
      </div>
    </div>
  );
}

function MyScore({ player, phase }: { player: PublicPlayer; phase: string }) {
  if (player.call === null) return <span className="text-sm text-muted">No call yet</span>;
  const t = tally(player, phase);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">{phase === "Call" ? "Called" : "Won / called"}</span>
      <span style={{ "--glow": t.glow } as React.CSSProperties} className={`glow-num rounded-full px-2.5 py-0.5 text-base tabular-nums ${t.cls}`}>
        {t.text}
      </span>
    </div>
  );
}

function CallPicker({ view, busy, onCall }: { view: RoomView; busy: boolean; onCall: (n: number) => void }) {
  const options = Array.from({ length: view.cardsThisRound + 1 }, (_, i) => i);
  const totalCalled = view.players.reduce((sum, p) => sum + (p.call ?? 0), 0);
  return (
    <div className="anim-pop w-full pt-6">
      <div className="grid grid-cols-4 gap-2.5">
        {options.map((n) => {
          const blocked = n === view.forbiddenCall;
          return (
            <button
              key={n}
              disabled={blocked || busy}
              onClick={() => onCall(n)}
              className="btn btn-primary relative !min-h-16 text-2xl font-black tabular-nums disabled:!bg-white/10 disabled:!text-white/30 disabled:!shadow-none"
            >
              <span className={blocked ? "line-through" : ""}>{n}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-white/60">
        {view.forbiddenCall !== null
          ? `As dealer you can't call ${view.forbiddenCall} — the total can't equal ${view.cardsThisRound}.`
          : totalCalled > 0
            ? `${totalCalled} of ${view.cardsThisRound} tricks called so far`
            : `${view.cardsThisRound} tricks up for grabs`}
      </p>
    </div>
  );
}

function Hand({
  cards,
  playable,
  selected,
  myTurn,
  onTap,
  disabled,
}: {
  cards: Card[];
  playable: Card[];
  selected: Card | null;
  myTurn: boolean;
  onTap: (card: Card) => void;
  disabled: boolean;
}) {
  const n = cards.length;
  // Gap between cards: 0.5rem when there's room, otherwise a negative margin so the whole hand fits the width.
  const gap = n > 1 ? `min(0.5rem, calc((100cqw - 2rem - 3.75rem * ${n}) / ${n - 1}))` : "0px";
  return (
    <div
      className="no-scrollbar flex min-h-[8.25rem] items-end justify-center overflow-x-auto px-4 pb-1 pt-4"
      style={{ containerType: "inline-size" }}
      aria-label="Your hand"
    >
      {cards.map((card, i) => {
        const isPlayable = playable.some((c) => sameCard(c, card));
        const isSelected = selected !== null && sameCard(selected, card);
        const dim = myTurn && !isPlayable;
        return (
          <button
            key={`${card.rank}${card.suit}`}
            onClick={() => onTap(card)}
            disabled={disabled}
            aria-label={`${card.rank} of ${card.suit}${isSelected ? ", selected. Tap again to play" : ""}`}
            style={{ marginLeft: i === 0 ? 0 : gap, zIndex: i }}
            className={`relative shrink-0 rounded-xl transition-all duration-200 ${isSelected ? "-translate-y-5" : myTurn && isPlayable ? "-translate-y-2" : ""} ${dim ? "brightness-[.55] saturate-50" : ""}`}
          >
            <PlayingCard card={card} size="md" className={isSelected ? "ring-4 ring-accent" : ""} />
          </button>
        );
      })}
      {n === 0 && <p className="pb-6 text-sm text-muted">No cards in hand</p>}
    </div>
  );
}
