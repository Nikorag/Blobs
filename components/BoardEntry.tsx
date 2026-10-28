"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";

/** Where The Board "logs in": type the code of the table to put on screen. */
export function BoardEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5">
      <Logo />
      <form
        className="glass anim-pop space-y-4 rounded-3xl p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 4) router.push(`/board/${code}`);
        }}
      >
        <div className="text-center">
          <h1 className="text-xl font-extrabold">The Board</h1>
          <p className="mt-1 text-sm text-muted">Show a table on a big screen. Enter the game code from the host&apos;s phone.</p>
        </div>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
          placeholder="CODE"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Game code"
          className="h-13 w-full rounded-2xl border border-line bg-black/25 px-4 text-center text-xl font-black uppercase tracking-[0.4em] outline-none placeholder:text-white/20 focus:border-accent"
        />
        <button type="submit" className="btn btn-primary w-full" disabled={code.length !== 4}>
          Open the Board
        </button>
        <Link href="/" className="block text-center text-sm font-semibold text-muted">Back</Link>
      </form>
    </main>
  );
}
