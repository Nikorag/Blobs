"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Type a room code, go to that table. The room page handles joining, or says if the code is wrong. */
export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 4) router.push(`/room/${code}`);
      }}
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
        placeholder="CODE"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Room code"
        className="h-13 min-w-0 flex-1 rounded-2xl border border-line bg-black/25 px-4 text-center text-xl font-black uppercase tracking-[0.4em] outline-none placeholder:text-white/20 focus:border-accent"
      />
      <button type="submit" className="btn btn-ghost !min-h-13" disabled={code.length !== 4}>
        Join
      </button>
    </form>
  );
}
