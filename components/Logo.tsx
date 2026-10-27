import { PlayingCard } from "./PlayingCard";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {!compact && (
        <div className="relative mb-5 h-36 w-44" aria-hidden>
          <div className="absolute left-0 top-6 -rotate-12">
            <PlayingCard card={{ rank: 14, suit: "s" }} size="lg" />
          </div>
          <div className="absolute left-[4.25rem] top-0">
            <PlayingCard card={{ rank: 13, suit: "h" }} size="lg" />
          </div>
          <div className="absolute right-0 top-6 rotate-12">
            <PlayingCard card={{ rank: 12, suit: "d" }} size="lg" />
          </div>
        </div>
      )}
      <h1 className={`font-black tracking-tight ${compact ? "text-2xl" : "text-6xl"}`}>
        Blobs<span className="text-accent">.</span>
      </h1>
    </div>
  );
}
