"use client";

import { useState } from "react";
import { CARD_STYLES, type Slot, SLOTS, SLOT_LABEL, price } from "@/lib/cosmetics/catalog";
import { EYES, type Look, MOUTHS, SHAPES, SKINS, defaultLook } from "@/lib/game/look";
import { Avatar } from "./Avatar";
import { useCosmetics } from "./CosmeticsProvider";
import { PlayingCard } from "./PlayingCard";
import { Sheet } from "./Sheet";
import { useZonto } from "./ZontoProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The blob to dress up in the previews. */
  look?: Look;
  initialSlot?: Slot;
}

const IDS: Record<Slot, readonly string[]> = {
  shape: SHAPES,
  eyes: EYES,
  mouth: MOUTHS,
  skin: SKINS,
  cards: CARD_STYLES,
};

const label = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

export function StoreSheet({ open, onClose, look = defaultLook(0), initialSlot = "shape" }: Props) {
  const cosmetics = useCosmetics();
  const zonto = useZonto();
  const [slot, setSlot] = useState<Slot>(initialSlot);

  return (
    <Sheet open={open} title="Store" onClose={onClose}>
      {cosmetics.status !== "ready" ? (
        <div className="space-y-3 pb-2 text-center">
          <p className="text-muted">
            {cosmetics.status === "signedOut" && "Sign in with Zonto to earn coins and unlock new looks. Your coins follow you across devices."}
            {cosmetics.status === "loading" && "Loading your coins…"}
            {cosmetics.status === "unavailable" && "Couldn't load your coins. Cloud saves may be switched off in your Zonto settings."}
          </p>
          {cosmetics.status === "signedOut" && (
            <button className="btn btn-primary w-full" onClick={zonto.signIn}>
              Sign in with Zonto
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-3 pb-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted">Earn coins by finishing and winning games.</span>
            <span className="rounded-full bg-surface2 px-3 py-1 font-black tabular-nums" aria-label={`${cosmetics.coins} coins`}>
              🪙 {cosmetics.coins}
            </span>
          </div>
          <div role="tablist" className="flex gap-1.5 overflow-x-auto">
            {SLOTS.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={slot === s}
                onClick={() => setSlot(s)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${slot === s ? "bg-accent text-accent-ink" : "bg-surface2"}`}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
          <ul className="grid min-h-0 grid-cols-3 gap-2 overflow-y-auto">
            {IDS[slot].map((id) => (
              <Item key={id} slot={slot} id={id} look={look} />
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

function Item({ slot, id, look }: { slot: Slot; id: string; look: Look }) {
  const cosmetics = useCosmetics();
  const cost = price(slot, id);
  const owned = cosmetics.isOwned(slot, id);
  const inUse = slot === "cards" && cosmetics.cards === id;
  const affordable = cosmetics.coins >= cost;

  return (
    <li className="glass flex flex-col items-center gap-1.5 rounded-2xl p-2.5">
      <div className="grid h-16 place-items-center">
        {slot === "cards" ? (
          <PlayingCard card={{ rank: 14, suit: "h" }} size="sm" styleId={id as (typeof CARD_STYLES)[number]} />
        ) : (
          <Avatar look={{ ...look, [slot]: id }} size="md" />
        )}
      </div>
      <span className="text-sm font-bold">{label(id)}</span>
      {owned ? (
        slot === "cards" ? (
          <button
            disabled={inUse}
            onClick={() => cosmetics.equipCards(id as (typeof CARD_STYLES)[number])}
            className={`w-full rounded-full px-2 py-1 text-xs font-bold ${inUse ? "bg-good/20 text-good" : "bg-surface2"}`}
          >
            {inUse ? "In use" : "Use"}
          </button>
        ) : (
          <span className="w-full rounded-full bg-good/20 px-2 py-1 text-center text-xs font-bold text-good">{cost === 0 ? "Free" : "Owned"}</span>
        )
      ) : (
        <button
          disabled={!affordable}
          onClick={() => cosmetics.buy(slot, id)}
          aria-label={`Buy ${label(id)} for ${cost} coins`}
          className="w-full rounded-full bg-accent px-2 py-1 text-xs font-black text-accent-ink disabled:opacity-40"
        >
          🪙 {cost}
        </button>
      )}
    </li>
  );
}
