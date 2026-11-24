import { describe, expect, it } from "vitest";
import { cardName } from "./cards";

describe("cardName", () => {
  it("speaks cards in full", () => {
    expect(cardName({ rank: 14, suit: "h" })).toBe("Ace of hearts");
    expect(cardName({ rank: 10, suit: "s" })).toBe("Ten of spades");
    expect(cardName({ rank: 2, suit: "c" })).toBe("Two of clubs");
    expect(cardName({ rank: 12, suit: "d" })).toBe("Queen of diamonds");
  });
});
