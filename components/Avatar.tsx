import { type Eyes, HUES, type Hat, type Look, type Mouth, type Shape, type Skin, defaultLook } from "@/lib/game/look";

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
  gumdrop: "rounded-[50%_50%_22%_22%/72%_72%_28%_28%]",
  wobble: "rounded-[38%_62%_63%_37%/41%_44%_56%_59%]",
  pebble: "rounded-[70%_30%_55%_45%/40%_60%_40%_60%]",
  square: "rounded-[26%]",
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
  heart: (
    <>
      <span className="absolute left-[22%] top-[38%] text-[0.26em] leading-none text-[#ff3b6b]">♥</span>
      <span className="absolute right-[22%] top-[38%] text-[0.26em] leading-none text-[#ff3b6b]">♥</span>
    </>
  ),
  star: (
    <>
      <span className="absolute left-[22%] top-[38%] text-[0.26em] leading-none text-[#ffe14d] [text-shadow:0_0_0.05em_#2a1630]">★</span>
      <span className="absolute right-[22%] top-[38%] text-[0.26em] leading-none text-[#ffe14d] [text-shadow:0_0_0.05em_#2a1630]">★</span>
    </>
  ),
  angry: (
    <>
      <span className={`absolute left-[26%] top-[46%] size-[12%] rounded-full ${INK}`} />
      <span className={`absolute right-[26%] top-[46%] size-[12%] rounded-full ${INK}`} />
      <span className={`absolute left-[22%] top-[38%] h-[3%] w-[20%] rotate-[18deg] rounded-full ${INK}`} />
      <span className={`absolute right-[22%] top-[38%] h-[3%] w-[20%] -rotate-[18deg] rounded-full ${INK}`} />
    </>
  ),
  crossed: (
    <>
      <span className="absolute left-[24%] top-[40%] text-[0.26em] font-black leading-none text-[#2a1630]">✕</span>
      <span className="absolute right-[24%] top-[40%] text-[0.26em] font-black leading-none text-[#2a1630]">✕</span>
    </>
  ),
  shades: (
    <>
      <span className={`absolute left-[16%] top-[40%] h-[17%] w-[30%] rounded-b-[40%] rounded-t-[10%] ${INK}`} />
      <span className={`absolute right-[16%] top-[40%] h-[17%] w-[30%] rounded-b-[40%] rounded-t-[10%] ${INK}`} />
      <span className={`absolute left-[44%] top-[42%] h-[3%] w-[12%] ${INK}`} />
      <span className="absolute left-[21%] top-[42%] h-[4%] w-[10%] -rotate-[20deg] rounded-full bg-white/40" />
      <span className="absolute right-[27%] top-[42%] h-[4%] w-[10%] -rotate-[20deg] rounded-full bg-white/40" />
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
  tongue: "h-[20%] w-[22%] rounded-b-full border-b-[0.1em] bg-[#ff6b8b]",
  fang: "h-[14%] w-[28%] rounded-b-full border-b-[0.12em] after:absolute after:left-[18%] after:top-0 after:h-[60%] after:w-[16%] after:[clip-path:polygon(0_0,100%_0,50%_100%)] after:bg-white",
  zigzag: "h-[12%] w-[30%] border-b-[0.12em] [clip-path:polygon(0_0,12%_100%,25%_0,37%_100%,50%_0,62%_100%,75%_0,87%_100%,100%_0,100%_100%,0_100%)] bg-[#3b1d2e]/85",
  cat: "h-[10%] w-[26%] rounded-b-full border-b-[0.12em] before:absolute before:left-[-6%] before:top-0 before:h-full before:w-1/2 before:rounded-b-full before:border-b-[0.12em] before:border-[#3b1d2e]/85",
};

const HATS_NODE: Record<Hat, React.ReactNode> = {
  none: null,
  cap: (
    <>
      <span className="absolute left-[18%] top-[-6%] h-[28%] w-[64%] rounded-t-full bg-[#e5484d]" />
      <span className="absolute left-[44%] top-[17%] h-[6%] w-[44%] rounded-full bg-[#b8272c]" />
    </>
  ),
  beanie: (
    <>
      <span className="absolute left-[44%] top-[-14%] size-[13%] rounded-full bg-white" />
      <span className="absolute left-[16%] top-[-6%] h-[28%] w-[68%] rounded-t-full bg-[#4d96ff]" />
      <span className="absolute left-[14%] top-[14%] h-[8%] w-[72%] rounded-full bg-[#2f6fd1]" />
    </>
  ),
  party: (
    <>
      <span className="absolute left-[33%] top-[-26%] h-[38%] w-[34%] bg-[linear-gradient(160deg,#ff6bd6,#ffd93d)] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      <span className="absolute left-[44%] top-[-30%] size-[12%] rounded-full bg-[#ffd93d]" />
    </>
  ),
  cowboy: (
    <>
      <span className="absolute left-[30%] top-[-8%] h-[22%] w-[40%] rounded-t-[45%] bg-[#a8683a]" />
      <span className="absolute left-[6%] top-[9%] h-[9%] w-[88%] rounded-full bg-[#8a4f26]" />
    </>
  ),
  halo: <span className="absolute left-[27%] top-[-14%] h-[10%] w-[46%] rounded-full border-[0.07em] border-[#ffe14d] shadow-[0_0_0.2em_#ffe14d]" />,
  tophat: (
    <>
      <span className="absolute left-[31%] top-[-22%] h-[32%] w-[38%] rounded-t-[12%] bg-[#2a1630]" />
      <span className="absolute left-[31%] top-[0%] h-[6%] w-[38%] bg-[#e5484d]" />
      <span className="absolute left-[18%] top-[9%] h-[6%] w-[64%] rounded-full bg-[#2a1630]" />
    </>
  ),
  wizard: (
    <>
      <span className="absolute left-[26%] top-[-36%] h-[48%] w-[48%] bg-[#5b3cc4] [clip-path:polygon(55%_0,100%_100%,0_100%)]" />
      <span className="absolute left-[44%] top-[-14%] text-[0.18em] leading-none text-[#ffe14d]">★</span>
      <span className="absolute left-[14%] top-[9%] h-[7%] w-[72%] rounded-full bg-[#46299c]" />
    </>
  ),
  crown: <span className="absolute left-[25%] top-[-12%] h-[26%] w-[50%] bg-[linear-gradient(180deg,#fff3b0,#f2c230_60%,#b9810c)] [clip-path:polygon(0_100%,0_20%,25%_55%,50%_0,75%_55%,100%_20%,100%_100%)]" />,
};

const GLITTER =
  "radial-gradient(circle at 20% 30%, #fff 0 4%, transparent 5%), radial-gradient(circle at 70% 20%, #fff 0 3%, transparent 4%), radial-gradient(circle at 55% 60%, #fff 0 4%, transparent 5%), radial-gradient(circle at 25% 75%, #fff 0 3%, transparent 4%), radial-gradient(circle at 80% 70%, #fff 0 3%, transparent 4%), radial-gradient(circle at 45% 12%, #fff 0 2%, transparent 3%)";

/** Skins either lay a pattern over the colour (`overlay`) or replace it altogether (`base`). */
function skinPaint(skin: Skin, h: number): { base?: string; overlay?: string } {
  switch (skin) {
    case "spots":
      return { overlay: `radial-gradient(circle at 28% 62%, hsl(${h} 70% 35% / 0.4) 0 9%, transparent 10%), radial-gradient(circle at 74% 70%, hsl(${h} 70% 35% / 0.4) 0 7%, transparent 8%), radial-gradient(circle at 62% 30%, hsl(${h} 70% 35% / 0.35) 0 6%, transparent 7%)` };
    case "stripes":
      return { overlay: `repeating-linear-gradient(120deg, transparent 0 12%, hsl(${h} 80% 90% / 0.38) 12% 22%)` };
    case "glitter":
      return { overlay: GLITTER };
    case "galaxy":
      return { base: "radial-gradient(circle at 30% 25%, #6b4bd6 0%, #2a1a6e 45%, #0d0a2e 100%)", overlay: GLITTER };
    case "gold":
      return { base: "linear-gradient(145deg, #fff3b0 0%, #f2c230 35%, #b9810c 65%, #ffe27a 100%)" };
    case "rainbow":
      return { base: "conic-gradient(from 200deg at 50% 55%, #ff6b6b, #ffd93d, #6bcB77, #4d96ff, #b266ff, #ff6b6b)" };
    default:
      return {};
  }
}

/** A glossy jelly blob with a little face. */
export function Avatar({ look, index = 0, size = "md", className = "" }: Props) {
  const { shape, eyes, mouth, skin, hat, color } = look ?? defaultLook(index);
  const h = avatarHue(color);
  const paint = skinPaint(skin, h);
  return (
    <div
      aria-hidden
      style={{
        fontSize: FONT[size],
        background: paint.base ?? `radial-gradient(circle at 32% 24%, hsl(${h} 95% 80%) 0%, hsl(${h} 80% 60%) 38%, hsl(${h} 75% 46%) 100%)`,
        boxShadow: `inset 0 -0.12em 0.2em hsl(${h} 80% 30% / 0.55), 0 0.08em 0.2em rgb(0 0 0 / 0.4)`,
      }}
      className={`relative shrink-0 ${SHAPE_CLASS[shape]} ${SIZES[size]} ${className}`}
    >
      {paint.overlay && <span className="absolute inset-0 rounded-[inherit]" style={{ background: paint.overlay }} />}
      {/* gloss */}
      <span className="absolute left-[16%] top-[12%] h-[20%] w-[30%] -rotate-[25deg] rounded-full bg-white/70 blur-[0.5px]" />
      <span className="absolute left-[56%] top-[14%] size-[8%] rounded-full bg-white/60" />
      {EYES_NODE[eyes]}
      <span className={`absolute left-1/2 top-[64%] -translate-x-1/2 border-[#3b1d2e]/85 ${MOUTH_CLASS[mouth]}`} />
      {HATS_NODE[hat]}
    </div>
  );
}
