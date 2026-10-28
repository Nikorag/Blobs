import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Difficulty } from "@/lib/game/types";
import { playBotGame, seeded } from "./harness";

describe("bots always play legal games", () => {
  const tables: Difficulty[][] = [
    ["easy", "easy", "easy", "easy"],
    ["normal", "normal", "normal", "normal"],
    ["hard", "normal", "easy", "hard"],
    ["normal", "easy"],
    ["hard", "hard", "hard", "hard", "hard", "hard", "hard", "hard"],
  ];
  for (const levels of tables) {
    it(`finishes ${levels.join("/")}`, () => {
      for (let seed = 1; seed <= 3; seed++) {
        const result = playBotGame(levels, seeded(seed * 7919), 8);
        expect(result.rounds).toBeGreaterThan(0);
      }
    }, 60_000);
  }
});

// Strength check: run with `TOURNAMENT=1 npx vitest run lib/ai/ai.test.ts`.
describe.runIf(process.env.TOURNAMENT)("tournament", () => {
  const GAMES = Number(process.env.GAMES ?? 150);
  const match = (focus: Difficulty, others: Difficulty) => {
    let total = 0;
    let hits = 0;
    let rounds = 0;
    let wins = 0;
    for (let g = 0; g < GAMES; g++) {
      // Rotate the seat of the bot under test so seating order doesn't bias the result.
      const seat = g % 4;
      const levels = Array.from({ length: 4 }, (_, i) => (i === seat ? focus : others));
      const r = playBotGame(levels, seeded(1000 + g), Number(process.env.BUDGET ?? 120));
      total += r.scores[seat];
      hits += r.hits[seat];
      rounds += r.rounds;
      if (r.scores[seat] === Math.max(...r.scores)) wins++;
    }
    return { avgScore: +(total / GAMES).toFixed(2), hitRate: +(hits / rounds).toFixed(3), winRate: +(wins / GAMES).toFixed(2) };
  };

  it("reports strength by level", () => {
    const rows: Record<string, unknown> = {};
    const matchups = (process.env.ROWS ?? "easy:normal,normal:normal,normal:easy,hard:normal")
      .split(",")
      .map((r) => r.split(":") as [Difficulty, Difficulty]);
    for (const [focus, others] of matchups) {
      rows[`${focus} vs 3x ${others}`] = match(focus, others);
    }
    const out = JSON.stringify(rows, null, 1);
    if (process.env.TOURNAMENT_OUT) writeFileSync(process.env.TOURNAMENT_OUT, out);
    console.log(out);
  }, 900_000);
});
