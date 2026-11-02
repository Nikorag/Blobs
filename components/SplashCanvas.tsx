"use client";

import { useEffect, useRef } from "react";

type RGB = { r: number; g: number; b: number };
type Tone = { hi: RGB; lt: RGB; base: RGB; lo: RGB };

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const pack = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const px = (c: RGB) => (255 << 24) | ((c.b | 0) << 16) | ((c.g | 0) << 8) | (c.r | 0);
const lerp = (a: RGB, b: RGB, t: number): RGB => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
});
const lerpn = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (p: number) => Math.max(0, Math.min(1, p));
const ease = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
const smooth = (p: number) => {
  p = clamp01(p);
  return p * p * (3 - 2 * p);
};

// palette
const OUT = pack("#0a2616");
const CREAM = pack("#f7f0da");
const CARD_EDGE = pack("#fbf6e6");
const RED = pack("#e8260f");
const YELLOW = pack("#ffc20e");
const GREEN = pack("#00a64f");
const BLUE = pack("#0a6fd6");
const BACK_BASE = pack("#1d46a0");
const BACK_A = pack("#5d8fe6");
const BACK_B = pack("#3a68c8");
const Z_BAND = [RED, YELLOW, GREEN, BLUE];
const GOLD: Tone = { hi: pack("#fff8c8"), lt: pack("#ffe066"), base: pack("#ffc01f"), lo: pack("#c47a0c") };
const PALE: Tone = { hi: pack("#ffffff"), lt: pack("#fdf6dd"), base: pack("#efe3b8"), lo: pack("#b5a574") };

// pixel font for ZONTO GAMES
const FONT: Record<string, string[]> = {
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
};
const BOLD: Record<string, string[]> = {};
for (const ch of Object.keys(FONT)) {
  const g = FONT[ch];
  const out: string[] = [];
  for (let r = 0; r < 7; r++) {
    let row = "";
    for (let c = 0; c < 6; c++) {
      row += (c < 5 && g[r][c] === "1") || (c > 0 && g[r][c - 1] === "1") ? "1" : "0";
    }
    out.push(row);
  }
  BOLD[ch] = out;
}

// the Z on the card face
const TH = 0.3;
const DW = 0.55;
const RAWZ: [number, number][] = [
  [0, 1], [1, 1], [1, 1 - TH], [DW, TH], [1, TH], [1, 0], [0, 0], [0, TH], [1 - DW, 1 - TH], [0, 1 - TH],
];
function inPoly(P: [number, number][], x: number, y: number) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i];
    const [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inZ = (nx: number, ny: number) => nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1 && inPoly(RAWZ, nx, ny);
// kept well inside the red border (which starts ~0.155 in), leaving room for the dark outline
const BZ = { u0: 0.3, u1: 0.7, v0: 0.3, v1: 0.7 };
const bigZy = (v: number) => 1 - (v - BZ.v0) / (BZ.v1 - BZ.v0);
const bigZ = (u: number, v: number) => inZ((u - BZ.u0) / (BZ.u1 - BZ.u0), bigZy(v));
const smallZ = (u: number, v: number) => inZ((u - 0.08) / 0.18, 1 - (v - 0.06) / 0.17);

function cardColor(u: number, v: number, w: number, h: number, faceUp: boolean): RGB {
  const cxp = u * w;
  const cyp = v * h;
  const bw = Math.max(1, w / 22);
  const e = Math.min(cxp, w - cxp, cyp, h - cyp) / bw;
  if (e < 1) return OUT;
  if (e < 2.6) return CARD_EDGE;
  if (!faceUp) {
    const a = Math.floor(cxp / bw);
    const b = Math.floor(cyp / bw);
    const dm = Math.abs(cxp - w / 2) / (w * 0.2) + Math.abs(cyp - h / 2) / (h * 0.14);
    if (dm < 0.55) return RED;
    if (dm < 1) return CARD_EDGE;
    if (((a + b) & 3) === 0) return BACK_A;
    if ((((a - b) % 4) + 4) % 4 === 0) return BACK_B;
    return BACK_BASE;
  }
  if (e >= 3.4 && e < 4.4) return pack("#c0392b");
  const eu = (1.2 * bw) / w;
  const ev = (1.2 * bw) / h;
  if (bigZ(u, v)) {
    const ny = bigZy(v);
    return ny > 0.7 ? Z_BAND[0] : ny > 0.5 ? Z_BAND[1] : ny > 0.3 ? Z_BAND[2] : Z_BAND[3];
  }
  if (
    bigZ(u - eu, v) || bigZ(u + eu, v) || bigZ(u, v - ev) || bigZ(u, v + ev) ||
    bigZ(u - eu, v - ev) || bigZ(u + eu, v + ev) || bigZ(u - eu, v + ev) || bigZ(u + eu, v - ev)
  ) return pack("#14183c");
  if (smallZ(u, v) || smallZ(1 - u, 1 - v)) return pack("#d62828");
  return CREAM;
}

type CardState = { x: number; y: number; w: number; h: number; ang: number; sx: number; face: boolean; sh: number };

function runSplash(cv: HTMLCanvasElement): () => void {
  const ctx = cv.getContext("2d");
  if (!ctx) return () => {};

  let W = 0, H = 0, U = 0, sc = 1, img!: ImageData, buf!: Uint32Array, bg!: Uint32Array;
  let AL = 1; // global dither alpha used by put()
  let cardW = 0, cardH = 0, bigW = 0, bigH = 0, bigCy = 0;
  let deck = { x: 0, y: 0 };
  let targets: { x: number; y: number }[] = [];
  const finalAng = [-0.07, 0.06, 0.03, -0.04, 0.02];

  function put(x: number, y: number, c: RGB) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (AL < 1 && AL <= (BAYER4[y & 3][x & 3] + 0.5) / 16) return;
    buf[y * W + x] = px(c);
  }
  function darken(x: number, y: number, f: number) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (AL < 1 && AL <= (BAYER4[y & 3][x & 3] + 0.5) / 16) return;
    const v = buf[y * W + x];
    buf[y * W + x] =
      (255 << 24) | ((((v >> 16) & 255) * f | 0) << 16) | ((((v >> 8) & 255) * f | 0) << 8) | (((v & 255) * f) | 0);
  }

  function drawTitle(str: string, cx: number, y: number, s: number, gap: number, tone: Tone, shadowCol: RGB) {
    const n = str.length;
    const step = (6 + gap) * s;
    const totalW = n * step - gap * s;
    const gh = 7 * s;
    const PAD = 4;
    const mw = totalW + PAD * 2;
    const mh = gh + PAD * 2;
    const mask = new Uint8Array(mw * mh);
    for (let k = 0; k < n; k++) {
      const g = BOLD[str[k]];
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 6; c++) {
          if (g[r][c] !== "1") continue;
          for (let sy = 0; sy < s; sy++)
            for (let sx = 0; sx < s; sx++) mask[(PAD + r * s + sy) * mw + PAD + k * step + c * s + sx] = 1;
        }
    }
    const ox = Math.round(cx - totalW / 2) - PAD;
    const oy = y - PAD;
    const has = (mx: number, my: number) => mx >= 0 && my >= 0 && mx < mw && my < mh && mask[my * mw + mx] === 1;
    const rad = s >= 3 ? 2 : 1;
    const dilate = (col: RGB, offx: number, offy: number) => {
      for (let my = 0; my < mh; my++)
        for (let mx = 0; mx < mw; mx++) {
          if (!has(mx, my)) continue;
          for (let dy = -rad; dy <= rad; dy++)
            for (let dx = -rad; dx <= rad; dx++) {
              if (Math.abs(dx) + Math.abs(dy) > rad + 1) continue;
              put(ox + mx + dx + offx, oy + my + dy + offy, col);
            }
        }
    };
    dilate(shadowCol, rad, rad + 1);
    dilate(OUT, 0, 0);
    for (let my = 0; my < mh; my++)
      for (let mx = 0; mx < mw; mx++) {
        if (!has(mx, my)) continue;
        const fr = (my - PAD) / gh;
        let col: RGB;
        if (!has(mx, my - 1) || !has(mx - 1, my)) col = tone.hi;
        else if (!has(mx, my + 1) || !has(mx + 1, my)) col = tone.lo;
        else if (fr < 0.4) col = tone.lt;
        else if (fr < 0.75) col = tone.base;
        else col = lerp(tone.base, tone.lo, 0.45);
        put(ox + mx, oy + my, col);
      }
  }

  function drawCard(cx: number, cy: number, w: number, h: number, ang: number, sx: number, faceUp: boolean, shOff: number) {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const hw = Math.max(0.6, (w * sx) / 2);
    const hh = h / 2;
    const R = Math.ceil(Math.hypot(hw, hh)) + 5;
    const x0 = Math.floor(cx - R);
    const y0 = Math.floor(cy - R);
    const rr = 2;
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 0 && shOff <= 0) continue;
      const ofx = pass === 0 ? shOff * 0.6 : 0;
      const ofy = pass === 0 ? shOff : 0;
      for (let y = y0; y <= y0 + 2 * R; y++)
        for (let x = x0; x <= x0 + 2 * R; x++) {
          const dx = x + 0.5 - cx - ofx;
          const dy = y + 0.5 - cy - ofy;
          const lx = ca * dx + sa * dy;
          const ly = -sa * dx + ca * dy;
          if (Math.abs(lx) > hw || Math.abs(ly) > hh) continue;
          const ax = hw - Math.abs(lx);
          const ay = hh - Math.abs(ly);
          if (ax < rr && ay < rr) {
            const ddx = rr - ax;
            const ddy = rr - ay;
            if (ddx * ddx + ddy * ddy > rr * rr) continue;
          }
          if (pass === 0) {
            darken(x, y, 0.55);
            continue;
          }
          put(x, y, cardColor(0.5 + lx / (2 * hw), 0.5 + ly / h, w, h, faceUp));
        }
    }
  }

  function build() {
    U = Math.min(W, H * 0.62);
    sc = Math.max(1, U / 130);
    cardW = Math.max(14, Math.floor(U * 0.17));
    cardH = Math.round(cardW * 1.4);
    const gap = Math.max(2, Math.round(cardW * 0.15));
    const ccx = W / 2;
    const dx = cardW + gap;
    const dy = cardH + gap;
    deck = { x: Math.round(W * 0.4), y: Math.round(H * 0.215) };
    // deal far enough down that the top card (and its spin) clears the deck pile
    const ccy = Math.max(H * 0.47, deck.y + 2 * cardH + gap + 6 * sc);
    // dealing order: left, right, bottom, centre, top (the top one gets flipped)
    targets = [
      { x: ccx - dx, y: ccy }, { x: ccx + dx, y: ccy }, { x: ccx, y: ccy + dy },
      { x: ccx, y: ccy }, { x: ccx, y: ccy - dy },
    ];
    bigW = Math.round(U * 0.46);
    bigH = Math.round(bigW * 1.4);
    bigCy = Math.round(H * 0.37);

    // felt: speckled green, dark vignette, faint betting arc
    bg = new Uint32Array(W * H);
    const base = pack("#1f7a43"), dark = pack("#17623a"), light = pack("#2a8a52"), edge = pack("#0f4a2a");
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const hsh = (((x * 73856093) ^ (y * 19349663)) >>> 0) & 255;
        let c = hsh < 20 ? dark : hsh > 238 ? light : base;
        const ddx = (x - W / 2) / (W * 0.62);
        const ddy = (y - H * 0.48) / (H * 0.62);
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        const q = Math.max(0, d - 0.55) * 4.5;
        const b0 = Math.floor(q);
        const fr = q - b0;
        const lvl = Math.min(1, (b0 + (fr > (BAYER4[y & 3][x & 3] + 0.5) / 16 ? 1 : 0)) / 3);
        c = lerp(c, edge, lvl * 0.85);
        const ax = x - W / 2;
        const ay = y - H * 1.08;
        const ar = Math.sqrt(ax * ax + ay * ay);
        if (Math.abs(ar - W * 0.78) < 0.7 && (x + y) % 5 < 3) c = lerp(c, pack("#6fc38a"), 0.55);
        bg[y * W + x] = px(c);
      }
  }

  function resize() {
    const base = Math.min(window.innerWidth, window.innerHeight * 0.56);
    const scale = Math.max(2, Math.round(base / 150));
    W = Math.ceil(window.innerWidth / scale);
    H = Math.ceil(window.innerHeight / scale);
    cv.width = W;
    cv.height = H;
    cv.style.width = W * scale + "px";
    cv.style.height = H * scale + "px";
    img = ctx!.createImageData(W, H);
    buf = new Uint32Array(img.data.buffer);
    build();
  }

  // timeline (seconds)
  const dealStart = 0.7, dealGap = 0.42, dealDur = 0.42;
  const flipStart = 3.4, flipDur = 0.75;
  const zoomStart = 4.6, zoomDur = 1.0;
  const textStart = 5.7;

  function cardState(i: number, t: number): CardState | null {
    const p = (t - (dealStart + i * dealGap)) / dealDur;
    if (p < 0) return null;
    const tg = targets[i];
    const pe = ease(p);
    const st: CardState = { x: tg.x, y: tg.y, w: cardW, h: cardH, ang: finalAng[i], sx: 1, face: false, sh: 1 };
    if (p < 1) {
      const spin = (i % 2 ? -1 : 1) * (3.0 + i * 0.4);
      st.x = lerpn(deck.x, tg.x, pe);
      st.y = lerpn(deck.y, tg.y, pe) - Math.sin(Math.PI * pe) * 4 * sc;
      st.ang = finalAng[i] + (1 - pe) * spin;
      st.sh = 1 + 3 * Math.sin(Math.PI * pe);
    }
    if (i === 4) {
      const th = Math.PI * smooth((t - flipStart) / flipDur);
      if (t >= flipStart) {
        st.sx = Math.max(0.04, Math.abs(Math.cos(th)));
        st.face = th > Math.PI / 2;
        const lift = Math.sin(th);
        st.w = cardW * (1 + 0.18 * lift);
        st.h = cardH * (1 + 0.18 * lift);
        st.y -= lift * 3 * sc;
        st.sh = 1 + 4 * lift;
      }
      const z = ease((t - zoomStart) / zoomDur);
      if (t >= zoomStart) {
        st.x = lerpn(tg.x, W / 2, z);
        st.y = lerpn(tg.y, bigCy, z);
        st.w = lerpn(cardW, bigW, z);
        st.h = lerpn(cardH, bigH, z);
        st.ang = lerpn(finalAng[4], 0, z);
        st.sh = 1 + 3 * z;
      }
      if (t >= zoomStart + zoomDur) {
        st.y = bigCy + Math.sin(t * 2) * 1.2 * sc;
        st.ang = Math.sin(t * 1.5) * 0.03;
        st.sh = 4;
      }
    }
    return st;
  }

  function sparkle(x: number, y: number, phase: number, t: number) {
    const r = Math.floor((Math.sin(t * 4 + phase) * 0.5 + 0.5) * 3.99);
    if (r < 1) return;
    const c = pack("#fff8c8");
    put(x, y, c);
    for (let i = 1; i <= r; i++) {
      put(x + i, y, c); put(x - i, y, c); put(x, y + i, c); put(x, y - i, c);
    }
  }

  const start = performance.now();
  let lastDraw = 0;
  let raf = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (now - lastDraw < 33) return;
    lastDraw = now;
    const t = (now - start) / 1000;

    buf.set(bg);
    AL = 1;

    // the deck
    for (let d = 2; d >= 0; d--) drawCard(deck.x + d, deck.y + d, cardW, cardH, 0, 1, false, d === 2 ? 2 : 0);

    // four cards that get cleared away once the top one is flipped
    const fadeOthers = 1 - ease((t - zoomStart) / 0.5);
    if (fadeOthers > 0) {
      AL = fadeOthers;
      for (let i = 0; i < 4; i++) {
        const s = cardState(i, t);
        if (s) drawCard(s.x, s.y, s.w, s.h, s.ang, s.sx, s.face, s.sh);
      }
      AL = 1;
    }

    const top = cardState(4, t);
    if (top) drawCard(top.x, top.y, top.w, top.h, top.ang, top.sx, top.face, top.sh);

    // title
    const ta = ease((t - textStart) / 0.8);
    if (ta > 0) {
      AL = ta;
      const s1 = Math.max(2, Math.floor((W * 0.82) / 34));
      const s2 = Math.max(1, s1 - 1);
      const ty = bigCy + Math.round(bigH / 2) + Math.round(10 * sc);
      drawTitle("ZONTO", W / 2, ty, s1, 1, GOLD, pack("#06180d"));
      drawTitle("GAMES", W / 2, ty + 7 * s1 + Math.max(5, s1 * 2), s2, 1, PALE, pack("#06180d"));
      AL = 1;
      const hwid = Math.round(bigW / 2);
      sparkle(Math.round(W / 2 - hwid - 5), bigCy - Math.round(bigH / 2) + 4, 0, t);
      sparkle(Math.round(W / 2 + hwid + 5), bigCy - Math.round(bigH / 2) + 12, 2, t);
      sparkle(Math.round(W / 2 + hwid + 3), bigCy + Math.round(bigH / 2) - 6, 4, t);
    }

    ctx!.putImageData(img, 0, 0);
  }

  window.addEventListener("resize", resize);
  resize();
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };
}

export function SplashCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => (ref.current ? runSplash(ref.current) : undefined), []);
  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-[#1c6b3d]">
      <canvas ref={ref} className="block [image-rendering:pixelated]" aria-hidden />
    </div>
  );
}
