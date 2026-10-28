/** Jelly colours lifted from the key art: coral, teal, yellow, purple, then a few extras. */
const HUES = [10, 172, 46, 268, 200, 330, 100, 28];

export function avatarHue(index: number): number {
  return HUES[index % HUES.length];
}

export function avatarColor(index: number): string {
  return `hsl(${avatarHue(index)} 80% 58%)`;
}

interface Props {
  index: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "size-8", md: "size-11", lg: "size-16" };
const FONT = { sm: "2rem", md: "2.75rem", lg: "4rem" };

type Mouth = "smile" | "o" | "flat" | "smirk";
const MOUTHS: Mouth[] = ["smirk", "flat", "o", "smile"];

const MOUTH_CLASS: Record<Mouth, string> = {
  smile: "h-[16%] w-[26%] rounded-b-full border-b-[0.14em]",
  smirk: "h-[12%] w-[24%] -rotate-6 rounded-b-full border-b-[0.14em]",
  flat: "h-0 w-[20%] rounded-full border-b-[0.12em]",
  o: "h-[20%] w-[16%] rounded-full bg-[#3b1d2e]/85",
};

/** A glossy jelly blob with a little face. The face is picked from the seat so each player is recognisable. */
export function Avatar({ index, size = "md", className = "" }: Props) {
  const h = avatarHue(index);
  const mouth = MOUTHS[index % MOUTHS.length];
  return (
    <div
      aria-hidden
      style={{
        fontSize: FONT[size],
        background: `radial-gradient(circle at 32% 24%, hsl(${h} 95% 80%) 0%, hsl(${h} 80% 60%) 38%, hsl(${h} 75% 46%) 100%)`,
        boxShadow: `inset 0 -0.12em 0.2em hsl(${h} 80% 30% / 0.55), 0 0.08em 0.2em rgb(0 0 0 / 0.4)`,
      }}
      className={`relative shrink-0 rounded-[52%_48%_42%_42%/62%_62%_38%_38%] ${SIZES[size]} ${className}`}
    >
      {/* gloss */}
      <span className="absolute left-[16%] top-[12%] h-[20%] w-[30%] -rotate-[25deg] rounded-full bg-white/70 blur-[0.5px]" />
      <span className="absolute left-[56%] top-[14%] size-[8%] rounded-full bg-white/60" />
      {/* eyes */}
      <span className="absolute left-[26%] top-[44%] size-[13%] rounded-full bg-[#2a1630]" />
      <span className="absolute right-[26%] top-[44%] size-[13%] rounded-full bg-[#2a1630]" />
      <span className="absolute left-[29%] top-[45%] size-[4%] rounded-full bg-white/90" />
      <span className="absolute right-[29%] top-[45%] size-[4%] rounded-full bg-white/90" />
      {/* mouth */}
      <span className={`absolute left-1/2 top-[64%] -translate-x-1/2 border-[#3b1d2e]/85 ${MOUTH_CLASS[mouth]}`} />
    </div>
  );
}
