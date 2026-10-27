import { rankLabel, SUIT_INFO } from "@/lib/game/cards";
import type { Card } from "@/lib/game/types";

export type CardSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<CardSize, { box: string; corner: string; pip: string }> = {
  xs: { box: "w-8 h-11 rounded-md", corner: "text-[11px]", pip: "text-lg" },
  sm: { box: "w-11 h-16 rounded-lg", corner: "text-xs", pip: "text-2xl" },
  md: { box: "w-[3.75rem] h-[5.5rem] rounded-xl", corner: "text-sm", pip: "text-4xl" },
  lg: { box: "w-[4.5rem] h-[6.5rem] rounded-xl", corner: "text-base", pip: "text-5xl" },
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
  const color = suit.red ? "text-[var(--card-red)]" : "text-[var(--card-black)]";
  return (
    <div
      role="img"
      aria-label={`${rankLabel(card.rank)} of ${suit.name}`}
      style={style}
      className={`relative shrink-0 select-none bg-gradient-to-b from-white to-[#eef1f0] shadow-[0_6px_14px_-4px_rgb(0_0_0/0.55),0_0_0_1px_rgb(0_0_0/0.08)] ${s.box} ${color} ${className}`}
    >
      <div className={`absolute left-1.5 top-1 flex flex-col items-center font-extrabold leading-none ${s.corner}`}>
        <span>{rankLabel(card.rank)}</span>
        <span className="-mt-px">{suit.symbol}</span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center pt-2 leading-none ${s.pip}`}>
        {suit.symbol}
      </div>
    </div>
  );
}

export function CardBack({ size = "xs", className = "" }: { size?: CardSize; className?: string }) {
  return (
    <div
      aria-hidden
      className={`shrink-0 bg-[repeating-linear-gradient(45deg,#2b4cc4_0_4px,#233da0_4px_8px)] ring-1 ring-white/70 ring-inset ${SIZES[size].box} ${className}`}
    />
  );
}
