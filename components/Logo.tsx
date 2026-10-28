import { Avatar } from "./Avatar";

const LETTERS: [string, string][] = [
  ["B", "var(--jelly-coral)"],
  ["l", "var(--jelly-yellow)"],
  ["o", "var(--jelly-teal)"],
  ["b", "var(--jelly-purple)"],
  ["s", "var(--jelly-coral)"],
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {!compact && (
        <div className="mb-3 flex items-end gap-1" aria-hidden>
          <Avatar index={1} size="lg" className="anim-jiggle !size-20 -rotate-6" />
          <Avatar index={0} size="lg" className="anim-jiggle !size-24" />
          <Avatar index={3} size="lg" className="anim-jiggle !size-20 rotate-6" />
        </div>
      )}
      <h1 aria-label="Blobs" className={`font-bold tracking-tight ${compact ? "text-2xl" : "text-7xl"}`}>
        {LETTERS.map(([ch, color], i) => (
          <span
            key={i}
            aria-hidden
            style={{ color, textShadow: `0 0.06em 0 rgb(0 0 0 / 0.3), 0 0 0.5em color-mix(in srgb, ${color} 55%, transparent)` }}
          >
            {ch}
          </span>
        ))}
      </h1>
    </div>
  );
}
