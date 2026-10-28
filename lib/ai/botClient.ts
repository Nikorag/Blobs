import { chooseMove } from "./index";
import type { BotInput, BotMove } from "./types";

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (move: BotMove) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; move: BotMove }>) => {
      pending.get(e.data.id)?.(e.data.move);
      pending.delete(e.data.id);
    };
    worker.onerror = () => {
      // Worker failed to load: answer anything outstanding on the main thread instead.
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Ask a bot for its move. Hard thinks in a Web Worker so the UI stays smooth. */
export function requestMove(input: BotInput): Promise<BotMove> {
  const w = input.difficulty === "hard" ? getWorker() : null;
  if (!w) return Promise.resolve(chooseMove(input, Math.random));
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    w.postMessage({ id, input });
    // If the worker dies silently, don't hang the game.
    setTimeout(() => {
      if (pending.delete(id)) resolve(chooseMove({ ...input, budgetMs: 60 }, Math.random));
    }, (input.budgetMs ?? 400) + 3000);
  });
}
