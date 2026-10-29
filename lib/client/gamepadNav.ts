export type Direction = "up" | "down" | "left" | "right";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const centre = (b: Box) => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });

/** Index of the box to move to from `from` in `dir`, or -1 if nothing lies that way. Prefers straight-line neighbours. */
export function pickNext(from: Box, boxes: Box[], dir: Direction): number {
  const a = centre(from);
  const horizontal = dir === "left" || dir === "right";
  const sign = dir === "right" || dir === "down" ? 1 : -1;
  let best = -1;
  let bestScore = Infinity;
  boxes.forEach((box, i) => {
    const c = centre(box);
    const primary = ((horizontal ? c.x - a.x : c.y - a.y)) * sign;
    const secondary = Math.abs(horizontal ? c.y - a.y : c.x - a.x);
    if (primary < 1) return;
    // Off-axis distance counts double so a slightly-further element in line beats a nearer one off to the side.
    const score = primary + secondary * 2;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** Map a left-stick / d-pad reading to a direction, or null inside the dead zone. */
export function stickDirection(x: number, y: number, deadZone = 0.5): Direction | null {
  if (Math.hypot(x, y) < deadZone) return null;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? "right" : "left";
  return y > 0 ? "down" : "up";
}
