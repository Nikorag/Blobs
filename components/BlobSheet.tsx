"use client";

import { EYES, HUES, type Look, MOUTHS, SHAPES } from "@/lib/game/look";
import { Avatar, avatarColor } from "./Avatar";
import { Sheet } from "./Sheet";

interface Props {
  open: boolean;
  look: Look;
  onChange: (look: Look) => void;
  onClose: () => void;
}

/** Lobby picker for your blob's shape, eyes, mouth and colour. Changes apply as you tap. */
export function BlobSheet({ open, look, onChange, onClose }: Props) {
  return (
    <Sheet open={open} title="Design your blob" onClose={onClose}>
      <div className="space-y-4 overflow-y-auto pb-2">
        <div className="flex justify-center py-1">
          <Avatar look={look} className="!size-28 anim-jiggle" size="lg" />
        </div>

        <Group label="Shape">
          {SHAPES.map((shape) => (
            <Choice key={shape} name={shape} selected={look.shape === shape} onPick={() => onChange({ ...look, shape })}>
              <Avatar look={{ ...look, shape }} size="md" />
            </Choice>
          ))}
        </Group>
        <Group label="Eyes">
          {EYES.map((eyes) => (
            <Choice key={eyes} name={eyes} selected={look.eyes === eyes} onPick={() => onChange({ ...look, eyes })}>
              <Avatar look={{ ...look, eyes }} size="md" />
            </Choice>
          ))}
        </Group>
        <Group label="Mouth">
          {MOUTHS.map((mouth) => (
            <Choice key={mouth} name={mouth} selected={look.mouth === mouth} onPick={() => onChange({ ...look, mouth })}>
              <Avatar look={{ ...look, mouth }} size="md" />
            </Choice>
          ))}
        </Group>
        <Group label="Colour">
          {HUES.map((_, color) => (
            <Choice key={color} name={`colour ${color + 1}`} selected={look.color === color} onPick={() => onChange({ ...look, color })}>
              <span className="block size-9 rounded-full" style={{ background: avatarColor(color) }} />
            </Choice>
          ))}
        </Group>

        <button className="btn btn-primary w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wider text-muted">{label}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Choice({ name, selected, onPick, children }: { name: string; selected: boolean; onPick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onPick}
      aria-label={name}
      aria-pressed={selected}
      className={`grid size-14 place-items-center rounded-2xl border-2 bg-surface2 ${selected ? "border-accent" : "border-transparent"}`}
    >
      {children}
    </button>
  );
}
