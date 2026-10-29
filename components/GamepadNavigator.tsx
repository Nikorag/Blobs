"use client";

import { useEffect } from "react";
import { pickNext, stickDirection, type Direction } from "@/lib/client/gamepadNav";

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const REPEAT_DELAY_MS = 350;
const REPEAT_MS = 140;

// Standard mapping: 0 = A, 1 = B, 12-15 = d-pad up/down/left/right.
const DPAD: Record<number, Direction> = { 12: "up", 13: "down", 14: "left", 15: "right" };

/** The area focus is confined to: the open dialog if there is one, otherwise the whole page. */
function scope(): ParentNode {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  return dialogs[dialogs.length - 1] ?? document;
}

function candidates(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if ((el as HTMLButtonElement).disabled || el.closest("[aria-hidden='true'], [inert]")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function move(dir: Direction) {
  const root = scope();
  const all = candidates(root);
  if (all.length === 0) return;
  const current = document.activeElement as HTMLElement | null;
  if (!current || !all.includes(current)) {
    (all.find((el) => el.hasAttribute("data-pad-default")) ?? all[0]).focus();
    return;
  }
  const next = pickNext(
    current.getBoundingClientRect(),
    all.map((el) => el.getBoundingClientRect()),
    dir,
  );
  if (next >= 0) {
    all[next].focus();
    all[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

/** B button: close the open sheet, if any. */
function back() {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  const top = dialogs[dialogs.length - 1];
  top?.querySelector<HTMLElement>('button[aria-label="Close"]:not([tabindex="-1"])')?.click();
}

/**
 * Lets a gamepad drive the UI: d-pad / left stick moves focus between buttons, A presses, B closes sheets.
 * Renders nothing; while a pad is in use `html.pad-active` makes the focus ring visible.
 */
export function GamepadNavigator() {
  useEffect(() => {
    const html = document.documentElement;
    const held = new Map<string, { since: number; last: number }>();
    const pressed = new Set<string>();
    let raf = 0;

    const activate = () => html.classList.add("pad-active");
    const deactivate = () => html.classList.remove("pad-active");

    /** Fires once on press, then repeats while held. */
    const repeating = (key: string, down: boolean, now: number, fire: () => void) => {
      if (!down) return void held.delete(key);
      const h = held.get(key);
      if (!h) {
        held.set(key, { since: now, last: now });
        fire();
      } else if (now - h.since > REPEAT_DELAY_MS && now - h.last > REPEAT_MS) {
        h.last = now;
        fire();
      }
    };

    const once = (key: string, down: boolean, fire: () => void) => {
      if (down && !pressed.has(key)) {
        pressed.add(key);
        fire();
      } else if (!down) pressed.delete(key);
    };

    const poll = (now: number) => {
      raf = requestAnimationFrame(poll);
      const pad = Array.from(navigator.getGamepads?.() ?? []).find((p): p is Gamepad => !!p && p.connected);
      if (!pad) return;
      const btn = (i: number) => !!pad.buttons[i]?.pressed;

      let dir: Direction | null = null;
      for (const [i, d] of Object.entries(DPAD)) if (btn(Number(i))) dir = d;
      dir ??= stickDirection(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      if (dir) activate();
      repeating("move", dir !== null, now, () => dir && move(dir));

      once("a", btn(0), () => {
        activate();
        const el = document.activeElement as HTMLElement | null;
        if (el && el !== document.body) el.click();
        else move("down");
      });
      once("b", btn(1), () => {
        activate();
        back();
      });
    };

    raf = requestAnimationFrame(poll);
    window.addEventListener("pointerdown", deactivate);
    window.addEventListener("keydown", deactivate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", deactivate);
      window.removeEventListener("keydown", deactivate);
      deactivate();
    };
  }, []);

  return null;
}
