import { describe, expect, it } from "vitest";
import { play, RECIPES } from "./audio";
import { DEFAULT_SETTINGS, getSettings, parseSettings, updateSettings } from "./settings";

describe("settings", () => {
  it("defaults to sound and haptics on", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.sound).toBe(true);
  });

  it("keeps valid stored booleans and ignores junk", () => {
    expect(parseSettings('{"sound":false,"haptics":"no","largeCards":true,"extra":1}')).toEqual({ ...DEFAULT_SETTINGS, sound: false, largeCards: true });
    expect(parseSettings("{nope")).toEqual(DEFAULT_SETTINGS);
  });

  it("updates in memory even when storage is unavailable", () => {
    updateSettings({ sound: false });
    expect(getSettings().sound).toBe(false);
    updateSettings({ sound: true });
    expect(getSettings().sound).toBe(true);
  });
});

describe("sound effects", () => {
  it("defines a short recipe for every event", () => {
    for (const name of ["tap", "cardPlay", "yourTurn", "trickWin", "trickLost", "blob", "spotOn", "gameWin"] as const) {
      const notes = RECIPES[name];
      expect(notes.length).toBeGreaterThan(0);
      for (const n of notes) expect(n.at + n.dur).toBeLessThan(1.2);
    }
  });

  it("does nothing, quietly, with no audio support or no tab", () => {
    expect(() => play("tap")).not.toThrow();
  });
});
