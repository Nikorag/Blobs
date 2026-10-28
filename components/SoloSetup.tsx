"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { randomName } from "@/lib/client/identity";
import type { Difficulty } from "@/lib/game/types";
import { createSoloGame } from "@/lib/solo/create";
import { writeSolo } from "@/lib/solo/save";
import { Avatar } from "./Avatar";
import { Sheet } from "./Sheet";

const LEVELS: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "easy", label: "Easy", blurb: "Plays on gut feel and makes mistakes." },
  { id: "normal", label: "Normal", blurb: "Counts cards and plays to hit its call." },
  { id: "hard", label: "Hard", blurb: "Simulates the rest of the round before every move." },
];

const DEFAULT_LEVELS: Difficulty[] = ["easy", "normal", "hard"];

function pickNames(count: number, avoid: string): string[] {
  const names = new Set<string>([avoid]);
  const out: string[] = [];
  while (out.length < count) {
    const n = randomName();
    if (!names.has(n)) {
      names.add(n);
      out.push(n);
    }
  }
  return out;
}

/** Choose a difficulty for each of the three computer opponents, then deal. */
export function SoloSetup({ open, onClose, playerName }: { open: boolean; onClose: () => void; playerName: string }) {
  const router = useRouter();
  const [levels, setLevels] = useState<Difficulty[]>(DEFAULT_LEVELS);
  // Names are picked when the sheet mounts so they stay put while you adjust levels.
  const [names] = useState(() => pickNames(3, playerName));

  function deal() {
    const config = { name: playerName, bots: names.map((name, i) => ({ name, level: levels[i] })) };
    writeSolo(createSoloGame(config));
    router.push("/solo");
  }

  return (
    <Sheet open={open} title="Play vs CPU" onClose={onClose}>
      <div className="space-y-3 pb-2">
        <p className="text-sm text-muted">Choose how sharp each opponent is.</p>
        {names.map((name, i) => (
          <div key={name} className="glass rounded-2xl p-3">
            <div className="mb-2.5 flex items-center gap-3">
              <Avatar index={i + 1} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{name}</p>
                <p className="truncate text-xs text-muted">{LEVELS.find((l) => l.id === levels[i])!.blurb}</p>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider text-muted">CPU</span>
            </div>
            <div role="radiogroup" aria-label={`${name} difficulty`} className="grid grid-cols-3 gap-1.5 rounded-xl bg-black/25 p-1">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  role="radio"
                  aria-checked={levels[i] === l.id}
                  onClick={() => setLevels((cur) => cur.map((v, idx) => (idx === i ? l.id : v)))}
                  className={`rounded-lg py-2 text-sm font-bold transition-colors ${levels[i] === l.id ? "bg-accent text-accent-ink" : "text-muted"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-primary w-full" onClick={deal} disabled={!playerName.trim()}>
          Deal me in
        </button>
      </div>
    </Sheet>
  );
}
