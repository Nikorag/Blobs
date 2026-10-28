import { type Eyes, HUES, type Look, type Mouth, type Shape, defaultLook } from "@/lib/game/look";

export function avatarHue(color: number): number {
  return HUES[color % HUES.length];
}

export function avatarColor(color: number): string {
  return `hsl(${avatarHue(color)} 80% 58%)`;
}

interface Props {
  /** The player's chosen blob. Falls back to the default face for `index`. */
  look?: Look;
  index?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "size-8", md: "size-11", lg: "size-16" };
const FONT = { sm: "2rem", md: "2.75rem", lg: "4rem" };

const SHAPE_CLASS: Record<Shape, string> = {
  jelly: "rounded-[52%_48%_42%_42%/62%_62%_38%_38%]",
  round: "rounded-full",
  egg: "rounded-[50%_50%_46%_46%/64%_64%_36%_36%]",
  bean: "rounded-[62%_38%_55%_45%/55%_62%_38%_45%]",
  squish: "rounded-[38%_38%_30%_30%/46%_46%_32%_32%]",
};

const INK = "bg-[#2a1630]";
const SHINE = "bg-white/90";

const EYES_NODE: Record<Eyes, React.ReactNode> = {
  dots: (
    <>
      <span className={`absolute left-[26%] top-[44%] size-[13%] rounded-full ${INK}`} />
      <span className={`absolute right-[26%] top-[44%] size-[13%] rounded-full ${INK}`} />
      <span className={`absolute left-[29%] top-[45%] size-[4%] rounded-full ${SHINE}`} />
      <span className={`absolute right-[29%] top-[45%] size-[4%] rounded-full ${SHINE}`} />
    </>
  ),
  wide: (
    <>
      <span className="absolute left-[20%] top-[38%] size-[22%] rounded-full bg-white" />
      <span className="absolute right-[20%] top-[38%] size-[22%] rounded-full bg-white" />
      <span className={`absolute left-[27%] top-[45%] size-[10%] rounded-full ${INK}`} />
      <span className={`absolute right-[27%] top-[45%] size-[10%] rounded-full ${INK}`} />
    </>
  ),
  sleepy: (
    <>
      <span className="absolute left-[24%] top-[46%] h-[7%] w-[17%] rounded-b-full border-b-[0.1em] border-[#2a1630]" />
      <span className="absolute right-[24%] top-[46%] h-[7%] w-[17%] rounded-b-full border-b-[0.1em] border-[#2a1630]" />
    </>
  ),
  happy: (
    <>
      <span className="absolute left-[24%] top-[44%] h-[9%] w-[17%] rounded-t-full border-t-[0.1em] border-[#2a1630]" />
      <span className="absolute right-[24%] top-[44%] h-[9%] w-[17%] rounded-t-full border-t-[0.1em] border-[#2a1630]" />
    </>
  ),
  cyclops: (
    <>
      <span className="absolute left-1/2 top-[36%] size-[28%] -translate-x-1/2 rounded-full bg-white" />
      <span className={`absolute left-1/2 top-[43%] size-[14%] -translate-x-1/2 rounded-full ${INK}`} />
    </>
  ),
  wink: (
    <>
      <span className={`absolute left-[26%] top-[44%] size-[13%] rounded-full ${INK}`} />
      <span className={`absolute left-[29%] top-[45%] size-[4%] rounded-full ${SHINE}`} />
      <span className="absolute right-[24%] top-[48%] h-0 w-[17%] border-b-[0.1em] border-[#2a1630]" />
    </>
  ),
};

const MOUTH_CLASS: Record<Mouth, string> = {
  smile: "h-[16%] w-[26%] rounded-b-full border-b-[0.14em]",
  smirk: "h-[12%] w-[24%] -rotate-6 rounded-b-full border-b-[0.14em]",
  flat: "h-0 w-[20%] rounded-full border-b-[0.12em]",
  o: "h-[20%] w-[16%] rounded-full bg-[#3b1d2e]/85",
  grin: "h-[16%] w-[34%] rounded-b-full border-[0.1em] bg-white",
  sad: "h-[12%] w-[24%] rounded-t-full border-t-[0.14em]",
};

/** A glossy jelly blob with a little face. */
export function Avatar({ look, index = 0, size = "md", className = "" }: Props) {
  const { shape, eyes, mouth, color } = look ?? defaultLook(index);
  const h = avatarHue(color);
  return (
    <div
      aria-hidden
      style={{
        fontSize: FONT[size],
        background: `radial-gradient(circle at 32% 24%, hsl(${h} 95% 80%) 0%, hsl(${h} 80% 60%) 38%, hsl(${h} 75% 46%) 100%)`,
        boxShadow: `inset 0 -0.12em 0.2em hsl(${h} 80% 30% / 0.55), 0 0.08em 0.2em rgb(0 0 0 / 0.4)`,
      }}
      className={`relative shrink-0 ${SHAPE_CLASS[shape]} ${SIZES[size]} ${className}`}
    >
      {/* gloss */}
      <span className="absolute left-[16%] top-[12%] h-[20%] w-[30%] -rotate-[25deg] rounded-full bg-white/70 blur-[0.5px]" />
      <span className="absolute left-[56%] top-[14%] size-[8%] rounded-full bg-white/60" />
      {EYES_NODE[eyes]}
      <span className={`absolute left-1/2 top-[64%] -translate-x-1/2 border-[#3b1d2e]/85 ${MOUTH_CLASS[mouth]}`} />
    </div>
  );
}
