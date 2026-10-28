import { rankLabel, SUIT_INFO } from "@/lib/game/cards";
import type { Card, Suit } from "@/lib/game/types";

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

interface Props {
  card: Card;
  size?: CardSize;
  className?: string;
  style?: React.CSSProperties;
}

export function PlayingCard({ card, size = "md", className = "", style }: Props) {
  const s = SIZES[size];
  const suit = SUIT_INFO[card.suit];
  return (
    <div
      role="img"
      aria-label={`${rankLabel(card.rank)} of ${suit.name}`}
      style={{ ...style, color: SUIT_COLOR[card.suit] }}
      className={`relative shrink-0 select-none bg-gradient-to-b from-[var(--cream)] to-[var(--cream-2)] shadow-[inset_0_2px_0_rgb(255_255_255/0.9),0_6px_0_-1px_rgb(120_90_40/0.35),0_10px_16px_-4px_rgb(0_0_0/0.55)] ${s.box} ${className}`}
    >
      <div className={`absolute left-1.5 top-1 flex flex-col items-center font-bold leading-none [text-shadow:0_1px_0_rgb(0_0_0/0.12)] ${s.corner}`}>
        <span>{rankLabel(card.rank)}</span>
        <span className="-mt-px text-[0.85em]">{suit.symbol}</span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center pt-2 leading-none [filter:drop-shadow(0_2px_0_rgb(0_0_0/0.18))] ${s.pip}`}>
        {suit.symbol}
      </div>
    </div>
  );
}

export function CardBack({ size = "xs", className = "" }: { size?: CardSize; className?: string }) {
  return (
    <div
      aria-hidden
      className={`shrink-0 bg-[radial-gradient(circle_at_30%_25%,#b99cff,#6d3fd8_70%)] ring-2 ring-[var(--cream)] ring-inset ${SIZES[size].box} ${className}`}
    />
  );
}
