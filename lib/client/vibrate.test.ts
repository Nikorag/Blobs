import { afterEach, describe, expect, it, vi } from "vitest";
import { vibrate } from "./identity";
import { updateSettings } from "./settings";

afterEach(() => {
  updateSettings({ haptics: true });
  vi.unstubAllGlobals();
});

describe("vibrate", () => {
  it("buzzes by default and stops completely when haptics are switched off", () => {
    const buzz = vi.fn();
    vi.stubGlobal("navigator", { vibrate: buzz });
    vibrate(50);
    expect(buzz).toHaveBeenCalledTimes(1);
    updateSettings({ haptics: false });
    vibrate([100, 50, 100]);
    expect(buzz).toHaveBeenCalledTimes(1);
  });
});
