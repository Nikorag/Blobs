"use client";

import { rankLabel, SUIT_INFO } from "@/lib/game/cards";
import type { CardStyle } from "@/lib/game/look";
import type { Card, Suit } from "@/lib/game/types";
import { useCosmetics } from "./CosmeticsProvider";

/** Whose card style to draw: yours always shows in your chosen style, everyone else's in theirs. */
export function cardStyleOf(view: { you: string; players: { id: string; look: { cards: CardStyle } }[] }, playerId: string | null, equipped: CardStyle): CardStyle {
  if (playerId === null || playerId === view.you) return equipped;
  return view.players.find((p) => p.id === playerId)?.look.cards ?? "classic";
}

export type CardSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<CardSize, { box: string; corner: string; pip: string }> = {
  xs: { box: "w-8 h-11 rounded-lg", corner: "text-[12px]", pip: "text-lg" },
  sm: { box: "w-11 h-16 rounded-[0.7rem]", corner: "text-sm", pip: "text-2xl" },
  md: { box: "w-[3.75rem] h-[5.5rem] rounded-2xl", corner: "text-base", pip: "text-4xl" },
  lg: { box: "w-[4.5rem] h-[6.5rem] rounded-2xl", corner: "text-lg", pip: "text-5xl" },
};

/** Each suit gets its own jelly colour, like the coloured blobs on the cards in the key art. */
const SUIT_COLOR: Record<Suit, string> = {
  c: "var(--suit-c)",
  h: "var(--suit-h)",
  d: "var(--suit-d)",
  s: "var(--suit-s)",
};

/** Card face and back for each style. Classic is the original look. */
const STYLES: Record<CardStyle, { face: string; back: string; trim: string }> = {
  classic: {
    face: "from-[var(--cream)] to-[var(--cream-2)]",
    back: "bg-[radial-gradient(circle_at_30%_25%,#b99cff,#6d3fd8_70%)]",
    trim: "ring-[var(--cream)]",
  },
  mint: {
    face: "from-[#f1fff8] to-[#bfeedd]",
    back: "bg-[radial-gradient(circle_at_30%_25%,#7ff0c8,#0e9f94_70%)]",
    trim: "ring-[#f1fff8]",
  },
  candy: {
    face: "from-[#fff1f6] to-[#ffc9dc]",
    back: "bg-[repeating-linear-gradient(45deg,#ff6fa5_0_8px,#ffb3d0_8px_16px)]",
    trim: "ring-[#fff1f6]",
  },
  ice: {
    face: "from-[#f4fbff] to-[#c6e4fa]",
    back: "bg-[radial-gradient(circle_at_30%_25%,#d8f1ff,#3f86e0_75%)]",
    trim: "ring-[#f4fbff]",
  },
  gold: {
    face: "from-[#fff6cf] to-[#f0cf74]",
    back: "bg-[linear-gradient(145deg,#fff1a8,#d9a520_45%,#8a5a06_100%)]",
    trim: "ring-[#fff6cf]",
  },
};

interface Props {
  card: Card;
  size?: CardSize;
  className?: string;
  style?: React.CSSProperties;
  /** Just the rank and one central suit symbol, for small displays where the corner index is clutter. */
  minimal?: boolean;
  /** Draw in this style instead of the player's chosen one (for store previews). */
  styleId?: CardStyle;
}

export function PlayingCard({ card, size = "md", className = "", style, minimal = false, styleId }: Props) {
  const equipped = useCosmetics().cards;
  const look = STYLES[styleId ?? equipped];
  const s = SIZES[size];
  const suit = SUIT_INFO[card.suit];
  return (
    <div
      role="img"
      aria-label={`${rankLabel(card.rank)} of ${suit.name}`}
      style={{ ...style, color: SUIT_COLOR[card.suit] }}
      className={`relative shrink-0 select-none bg-gradient-to-b ${look.face} shadow-[inset_0_2px_0_rgb(255_255_255/0.9),0_6px_0_-1px_rgb(120_90_40/0.35),0_10px_16px_-4px_rgb(0_0_0/0.55)] ${s.box} ${className}`}
    >
      {minimal ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 font-bold leading-none [text-shadow:0_1px_0_rgb(0_0_0/0.12)]">
          <span className={s.corner}>{rankLabel(card.rank)}</span>
          <span className={`${s.pip} [filter:drop-shadow(0_2px_0_rgb(0_0_0/0.18))]`}>{suit.symbol}</span>
        </div>
      ) : (
        <>
          <div className={`absolute left-1.5 top-1 flex flex-col items-center font-bold leading-none [text-shadow:0_1px_0_rgb(0_0_0/0.12)] ${s.corner}`}>
            <span>{rankLabel(card.rank)}</span>
            <span className="-mt-px text-[0.85em]">{suit.symbol}</span>
          </div>
          <div className={`absolute inset-0 flex items-center justify-center pt-2 leading-none [filter:drop-shadow(0_2px_0_rgb(0_0_0/0.18))] ${s.pip}`}>
            {suit.symbol}
          </div>
        </>
      )}
    </div>
  );
}

export function CardBack({ size = "xs", className = "", styleId }: { size?: CardSize; className?: string; styleId?: CardStyle }) {
  const equipped = useCosmetics().cards;
  const look = STYLES[styleId ?? equipped];
  return (
    <div
      aria-hidden
      className={`shrink-0 ${look.back} ring-2 ${look.trim} ring-inset ${SIZES[size].box} ${className}`}
    />
  );
}
