"use client";

import { useEffect, useRef, useState } from "react";

// The Zonto Games splash: the publisher sting, shown over the title screen
// on arrival and handing over to it once the composition has played.
// Implemented from the Claude Design composition
// "Zonto Splash.dc.html" (project 0f15d981). That file is a continuous
// composition: one element tree rendered as a pure function of an authored
// time axis T, with scene names mapping to cue times. This is the same
// model, reimplemented against a plain requestAnimationFrame clock so it
// needs none of the design canvas runtime.
//
// Deviations from the source, both deliberate:
//   * The composition is authored to loop. A splash hands over to the game,
//     so it plays once and then fades out.
//   * The design is a fixed 1920x1080 stage. This game is portrait-first,
//     so the full-bleed layers (scanlines, glow, vignette, flash) are sized
//     to the viewport, and only the lockup itself sits on a scaled stage --
//     otherwise the vignette's edges fall outside a phone screen entirely.
//
// It sits on the title screen (app/page.tsx) rather than in the game, so it
// plays on arrival -- before the menu -- not after the player has already
// committed by pressing Start.

// Scene table from the composition's OM_SCENES, as cumulative start times.
const CUE_STRIKE = 1.4;
const CUE_WORDMARK = 2.8;
const CUE_GAMES = 4.5;
const AUTHORED_TOTAL = 7.6;
// Time to fade the (by then black) overlay off once the composition ends.
const HANDOVER = 0.45;

const WHITE = "#FFFFFF";
const BAR_GREY = "#5C5C5C";
const DIAG_GREY = "#9B9B9B";
const GAMES_GREY = "#8A8A8A";
const ACCENT = "#FFFFFF";
const BACKDROP = "#050505";
// The design system's brand family (typography.css). Not bundled: Segoe UI
// is licensed with Windows and is not ours to redistribute in a web build,
// so this resolves it where the platform already has it and falls back to
// the system UI face everywhere else.
const FONT = '"Segoe UI", "Segoe UI Regular", system-ui, sans-serif';

// Easing curves, transcribed from the composition engine (animations-v3.jsx).
const easeOutQuart = (t: number) => 1 - (t - 1) ** 4;
const easeOutCubic = (t: number) => (t - 1) ** 3 + 1;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

// The engine's animate(): a value that holds `from` before `start`, `to`
// after `end`, and eases between.
function track(
  from: number,
  to: number,
  start: number,
  end: number,
  ease: (t: number) => number,
  t: number
) {
  if (t <= start) return from;
  if (t >= end) return to;
  return from + (to - from) * ease((t - start) / (end - start));
}

const enter = (f: number, to: number, s: number, e: number, t: number) =>
  track(f, to, s, e, easeOutQuart, t);
const draw = (f: number, to: number, s: number, e: number, t: number) =>
  track(f, to, s, e, easeOutCubic, t);
const pop = (f: number, to: number, s: number, e: number, t: number) =>
  track(f, to, s, e, easeOutBack, t);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// The stage is 1920x1080, but the lockup only occupies a narrow column of
// it. Fitting the full width would leave the logo tiny on a phone, so the
// scale is derived from the width the artwork actually needs.
const STAGE_W = 1920;
const STAGE_H = 1080;
const CONTENT_W = 760;

// A publisher sting is a once-per-visit thing. Returning to the title
// screen after a run must not replay it, so the fact it has been seen
// lives in sessionStorage: cleared when the tab closes, kept across
// in-session navigation.
const SEEN_KEY = "zonto-splash-seen";

export function ZontoSplash() {
  const [t, setT] = useState(0);
  const [done, setDone] = useState(false);
  const [scale, setScale] = useState(1);
  const startRef = useRef<number | null>(null);
  const skippedRef = useRef(false);

  useEffect(() => {
    const fit = () => {
      setScale(Math.min(window.innerWidth / CONTENT_W, window.innerHeight / STAGE_H));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    // Has the sting already played this session? Read here rather than in a
    // useState initializer because sessionStorage does not exist on the
    // server and the two would disagree at hydration; a private-mode
    // browser can also throw on the read itself.
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage unavailable: the sting simply plays every visit.
    }

    // Anyone who has asked not to be animated gets the composed lockup held
    // still instead of the strike-and-rise sequence.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    const tick = (now: number) => {
      // Dismissing on the first frame rather than straight from the effect
      // body: the black backdrop is already what a cold load shows, so a
      // single frame of it costs nothing and keeps this out of React's
      // cascading-render path.
      if (seen) {
        setDone(true);
        return;
      }
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;

      if (reduced) {
        // Mid-"Hold": everything has landed and nothing is moving much.
        setT(6.6);
        if (elapsed > 1.6) {
          setDone(true);
          return;
        }
      } else {
        setT(elapsed);
        if (elapsed >= AUTHORED_TOTAL + HANDOVER) {
          setDone(true);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Any input skips straight to the handover -- a splash must never stand
    // between the player and the game.
    const skip = () => {
      if (skippedRef.current) return;
      skippedRef.current = true;
      setT(AUTHORED_TOTAL);
      setDone(true);
    };
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  if (done) return null;

  // --- global: open from black, settle back to black -------------------
  const gOpacity = Math.min(
    enter(0, 1, 0, 0.45, t),
    enter(1, 0, AUTHORED_TOTAL - 0.55, AUTHORED_TOTAL - 0.05, t)
  );
  const camZoom = 1 + draw(0, 0.045, 0, AUTHORED_TOTAL, t);
  const overlayOpacity =
    t <= AUTHORED_TOTAL ? 1 : clamp01(1 - (t - AUTHORED_TOTAL) / HANDOVER);

  // --- frame hairlines --------------------------------------------------
  const lineGrow = enter(0, 1, 0.15, 1.05, t);
  const lineFade = enter(0, 0.85, 0.1, 0.7, t);

  // --- the Z, struck in three moves ------------------------------------
  const s = CUE_STRIKE;
  const topReveal = enter(0, 100, s, s + 0.3, t);
  const diagGrow = draw(0, 1, s + 0.22, s + 0.62, t);
  const botReveal = enter(0, 100, s + 0.5, s + 0.84, t);
  const flash = Math.min(
    enter(0, 0.42, s + 0.7, s + 0.82, t),
    enter(0.42, 0, s + 0.82, s + 1.15, t)
  );
  const markPop = pop(1.07, 1, s + 0.8, s + 1.25, t);
  const breathe = 1 + 0.005 * Math.sin((t - s) * 1.6);

  // --- ZONTO ------------------------------------------------------------
  const w = CUE_WORDMARK;
  const tracking = enter(0.72, 0.46, w, w + 1.1, t);
  const letters = "ZONTO".split("").map((ch, i) => {
    const st = w + i * 0.085;
    return {
      ch,
      opacity: enter(0, 1, st, st + 0.5, t),
      y: enter(26, 0, st, st + 0.6, t),
    };
  });

  // --- GAMES ------------------------------------------------------------
  const g = CUE_GAMES;
  const dashPush = enter(-34, 0, g, g + 0.6, t);
  const dashFade = enter(0, 1, g, g + 0.5, t);
  const gamesFade = enter(0, 1, g + 0.18, g + 0.8, t);
  const gamesTrack = enter(0.9, 0.55, g + 0.18, g + 1.0, t);

  const hairline = (side: "left" | "right") => ({
    position: "absolute" as const,
    top: 0,
    [side]: -104,
    width: 2,
    height: 320,
    background: ACCENT,
    opacity: lineFade * 0.55,
    transform: `scaleY(${lineGrow})`,
    transformOrigin: "center",
  });

  const fullBleed = { position: "absolute" as const, inset: 0, pointerEvents: "none" as const };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BACKDROP,
        overflow: "hidden",
        opacity: overlayOpacity,
        // Over every other overlay in the game. The Zonto SDK badge pins
        // itself higher than anything can out-stack, so it stays visible.
        zIndex: 50,
        touchAction: "none",
      }}
    >
      <div style={{ ...fullBleed, opacity: gOpacity }}>
        <div
          style={{
            ...fullBleed,
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.030) 0px, rgba(255,255,255,0.030) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px)",
            mixBlendMode: "screen",
          }}
        />
        <div
          style={{
            ...fullBleed,
            background:
              "radial-gradient(circle at 50% 44%, rgba(255,255,255,0.055), rgba(0,0,0,0) 58%)",
          }}
        />

        {/* The lockup, on the design's own 1920x1080 stage. */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: STAGE_W,
            height: STAGE_H,
            marginLeft: -STAGE_W / 2,
            marginTop: -STAGE_H / 2,
            transform: `scale(${scale * camZoom})`,
            transformOrigin: "50% 46%",
          }}
        >
          {/* logo mark */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 300,
              width: 320,
              height: 320,
              marginLeft: -160,
              transform: `scale(${markPop * breathe})`,
              transformOrigin: "50% 50%",
            }}
          >
            <div style={hairline("left")} />
            <div style={hairline("right")} />
            <div
              style={{
                position: "absolute",
                left: 182,
                top: 44,
                width: 76,
                height: 282,
                background: DIAG_GREY,
                transform: `rotate(29deg) scaleY(${diagGrow})`,
                transformOrigin: "50% 0%",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 10,
                top: 0,
                width: 300,
                height: 66,
                background: WHITE,
                clipPath: `inset(0 ${100 - topReveal}% 0 0)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 10,
                bottom: 0,
                width: 300,
                height: 66,
                background: BAR_GREY,
                clipPath: `inset(0 0 0 ${100 - botReveal}%)`,
              }}
            />
          </div>

          {/* wordmark */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 726,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 104,
                color: WHITE,
                letterSpacing: `${tracking}em`,
                paddingLeft: `${tracking}em`,
                lineHeight: 1,
              }}
            >
              {letters.map((l, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: l.opacity,
                    transform: `translateY(${l.y}px)`,
                  }}
                >
                  {l.ch}
                </span>
              ))}
            </div>
          </div>

          {/* games row */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 892,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 30,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                opacity: dashFade,
                transform: `translateX(${dashPush}px)`,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 22, height: 3, background: BAR_GREY }} />
              ))}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 30,
                color: GAMES_GREY,
                letterSpacing: `${gamesTrack}em`,
                paddingLeft: `${gamesTrack}em`,
                opacity: gamesFade,
              }}
            >
              GAMES
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                opacity: dashFade,
                transform: `translateX(${-dashPush}px)`,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 22, height: 3, background: BAR_GREY }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...fullBleed, background: WHITE, opacity: clamp01(flash) }} />
        <div
          style={{
            ...fullBleed,
            background:
              "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.72) 100%)",
          }}
        />
      </div>
    </div>
  );
}
