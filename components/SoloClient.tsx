"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useZontoAchievements } from "@/lib/zonto/useZontoAchievements";
import { useZontoPlay } from "@/lib/zonto/useZontoPlay";
import { type SoloSave, useSoloSave } from "@/lib/solo/save";
import { useSoloGame } from "@/lib/solo/useSoloGame";
import { EndScreen } from "./EndScreen";
import { GameScreen } from "./GameScreen";
import { Logo } from "./Logo";

export function SoloClient() {
  const save = useSoloSave();
  if (!save) {
    return (
      <main className="safe-top safe-bottom mx-auto grid min-h-dvh max-w-md place-items-center px-5 text-center">
        <div className="space-y-4">
          <Logo compact />
          <p className="text-muted">No game in progress.</p>
          <Link href="/" className="btn btn-primary">
            Back to start
          </Link>
        </div>
      </main>
    );
  }
  // Mount the game once from the saved state; it owns the state from then on.
  return <SoloGame save={save} />;
}

function SoloGame({ save }: { save: SoloSave }) {
  const router = useRouter();
  const quit = useCallback(() => router.push("/"), [router]);
  const room = useSoloGame(save, quit);
  const { view } = room;
  useZontoPlay(view?.phase === "Call" || view?.phase === "Play" || view?.phase === "Recap");
  useZontoAchievements(view);
  if (!view) return null;

  return (
    <>
      {view.phase === "End" ? <EndScreen room={room} view={view} /> : <GameScreen room={room} view={view} />}
      {room.error && (
        <button
          onClick={room.clearError}
          className="anim-pop safe-top fixed inset-x-4 top-0 z-50 mx-auto max-w-md rounded-2xl border border-bad/40 bg-[#2b1233] px-4 py-3 text-left text-sm font-semibold text-bad shadow-xl"
        >
          {room.error}
        </button>
      )}
    </>
  );
}
