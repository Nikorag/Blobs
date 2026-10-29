import { describe, expect, it } from "vitest";
import { pickNext, stickDirection, type Box } from "./gamepadNav";

const box = (left: number, top: number): Box => ({ left, top, width: 10, height: 10 });

describe("pickNext", () => {
  const from = box(100, 100);

  it("moves to the nearest element in each direction", () => {
    const boxes = [box(200, 100), box(0, 100), box(100, 200), box(100, 0)];
    expect(pickNext(from, boxes, "right")).toBe(0);
    expect(pickNext(from, boxes, "left")).toBe(1);
    expect(pickNext(from, boxes, "down")).toBe(2);
    expect(pickNext(from, boxes, "up")).toBe(3);
  });

  it("prefers an aligned element over a nearer one off to the side", () => {
    const boxes = [box(160, 190), box(100, 260)];
    expect(pickNext(from, boxes, "down")).toBe(1);
  });

  it("returns -1 when nothing lies that way", () => {
    expect(pickNext(from, [box(0, 100)], "right")).toBe(-1);
    expect(pickNext(from, [], "up")).toBe(-1);
  });
});

describe("stickDirection", () => {
  it("ignores small movements", () => {
    expect(stickDirection(0.2, 0.1)).toBeNull();
  });
  it("picks the dominant axis", () => {
    expect(stickDirection(0.9, 0.3)).toBe("right");
    expect(stickDirection(-0.9, 0.3)).toBe("left");
    expect(stickDirection(0.2, -0.8)).toBe("up");
    expect(stickDirection(0.2, 0.8)).toBe("down");
  });
});
