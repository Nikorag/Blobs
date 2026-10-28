import { describe, expect, it } from "vitest";
import type { RoomView } from "@/lib/game/types";
import { defaultLook } from "@/lib/game/look";
import { isOwned } from "./catalog";
import { award, buy, emptyWallet, gameFingerprint, gameReward, parseWallet } from "./wallet";

function endView(code: string, me: number, other: number): RoomView {
  const player = (id: string, total: number) => ({ id, name: id, ready: true, look: defaultLook(0), handCount: 0, call: null, tricks: 0, total, isHost: false });
  return {
    code,
    phase: "End",
    you: "me",
    players: [player("me", me), player("them", other)],
    history: [
      { cards: 2, calls: { me: 1, them: 0 }, tricks: { me: 1, them: 1 } },
      { cards: 1, calls: { me: 1, them: 1 }, tricks: { me: 0, them: 1 } },
    ],
  } as unknown as RoomView;
}

describe("wallet", () => {
  it("only buys what you can afford, once", () => {
    const poor = emptyWallet();
    expect(buy(poor, "shape", "bean")).toBeNull();
    const rich = { ...poor, coins: 100 };
    const bought = buy(rich, "shape", "bean")!;
    expect(bought.coins).toBe(40);
    expect(isOwned(new Set(bought.owned), "shape", "bean")).toBe(true);
    expect(buy(bought, "shape", "bean")).toBeNull();
    expect(buy(rich, "shape", "jelly")).toBeNull(); // free items can't be bought
  });

  it("pays a game out once", () => {
    const paid = award(emptyWallet(), "g1", 20);
    expect(paid.coins).toBe(20);
    expect(award(paid, "g1", 20)).toBe(paid);
    expect(award(paid, "g2", 5).coins).toBe(25);
  });

  it("pays more for winning and spot-on rounds, and half against the computer", () => {
    expect(gameReward(endView("ABCD", 1, 0))).toBe(15 + 10 + 2); // one spot-on round
    expect(gameReward(endView("ABCD", 0, 3))).toBe(15 + 2);
    expect(gameReward(endView("CPU", 1, 0))).toBe(14);
  });

  it("fingerprints differ between games and survive a reload", () => {
    const a = endView("ABCD", 1, 0);
    expect(gameFingerprint(a)).toBe(gameFingerprint(endView("ABCD", 1, 0)));
    const b = endView("ABCD", 1, 0);
    b.history[0].tricks.me = 0;
    expect(gameFingerprint(a)).not.toBe(gameFingerprint(b));
  });

  it("repairs a malformed cloud save", () => {
    const w = parseWallet({ coins: -5, owned: ["shape:bean", 3], cards: "nope", look: { shape: "x" } });
    expect(w.coins).toBe(0);
    expect(w.owned).toEqual(["shape:bean"]);
    expect(w.cards).toBe("classic");
    expect(parseWallet(null)).toEqual(emptyWallet());
  });
});
