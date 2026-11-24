"use client";

import { type Settings, updateSettings, useSettings } from "@/lib/client/settings";
import { Sheet } from "./Sheet";

const ROWS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "sound", label: "Sound", hint: "Card clicks, your-turn chime and round stings." },
  { key: "haptics", label: "Vibration", hint: "Buzz when it's your turn or you win a trick (phones that support it)." },
  { key: "reducedMotion", label: "Reduce motion", hint: "Skip the trump reveal and calm the animations." },
  { key: "largeCards", label: "Larger cards", hint: "Bigger cards in your hand." },
];

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings();
  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <ul className="space-y-2 pb-2">
        {ROWS.map(({ key, label, hint }) => {
          const on = settings[key];
          return (
            <li key={key}>
              <button
                role="switch"
                aria-checked={on}
                onClick={() => updateSettings({ [key]: !on })}
                className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
                <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-white/15"}`}>
                  <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
