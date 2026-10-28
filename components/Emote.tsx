"use client";

import { useEffect, useState } from "react";
import { EMOTE_IDS, EMOTE_SHOW_MS, EMOTES } from "@/lib/game/emotes";
import type { PublicPlayer } from "@/lib/game/types";

/**
 * A reaction bubble that pops up for a few seconds. `serverNow` is the server time of the view it came
 * from, so an emote already stale when you load the page (or rejoin) never shows.
 */
export function EmoteBubble({ emote, serverNow, className = "" }: { emote: PublicPlayer["emote"]; serverNow: number; className?: string }) {
  const [hiddenAt, setHiddenAt] = useState(0);
  const at = emote?.at ?? 0;
  const remaining = at + EMOTE_SHOW_MS - serverNow;

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setHiddenAt(at), remaining);
    return () => clearTimeout(t);
  }, [at, remaining]);

  if (!emote || remaining <= 0 || hiddenAt === at) return null;
  return (
    <span
      key={at}
      aria-label={`Reaction: ${emote.emote}`}
      className={`anim-pop pointer-events-none absolute z-20 rounded-full border border-line bg-[#151a45] px-2 py-0.5 text-2xl leading-tight shadow-lg ${className}`}
    >
      {EMOTES[emote.emote]}
    </span>
  );
}

/** A small tray of reactions, opened from a button. */
export function EmotePicker({ onPick, disabled }: { onPick: (emote: (typeof EMOTE_IDS)[number]) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Send a reaction"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full bg-surface2 text-lg"
      >
        😀
      </button>
      {open && (
        <div className="anim-pop glass absolute bottom-full left-0 z-30 mb-2 grid w-max grid-cols-4 gap-1 rounded-2xl p-2">
          {EMOTE_IDS.map((id) => (
            <button
              key={id}
              disabled={disabled}
              aria-label={id}
              onClick={() => {
                onPick(id);
                setOpen(false);
              }}
              className="grid size-11 place-items-center rounded-xl text-2xl active:bg-white/10"
            >
              {EMOTES[id]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
