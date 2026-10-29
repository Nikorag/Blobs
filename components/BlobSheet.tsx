"use client";

import { EYES, HATS, HUES, type Look, MOUTHS, SHAPES, SKINS } from "@/lib/game/look";
import { type Slot, price } from "@/lib/cosmetics/catalog";
import { Avatar, avatarColor } from "./Avatar";
import { useCosmetics } from "./CosmeticsProvider";
import { Sheet } from "./Sheet";

interface Props {
  open: boolean;
  look: Look;
  onChange: (look: Look) => void;
  onClose: () => void;
  /** Open the store on the tab for a locked item. */
  onShop: (slot: Slot) => void;
}

/** Lobby picker for your blob's shape, eyes, mouth and colour. Changes apply as you tap. */
export function BlobSheet({ open, look, onChange, onClose, onShop }: Props) {
  const { isOwned } = useCosmetics();
  return (
    <Sheet open={open} title="Design your blob" onClose={onClose}>
      <div className="space-y-4 overflow-y-auto pb-2">
        <div className="flex justify-center py-1">
          <Avatar look={look} className="!size-28 anim-jiggle" size="lg" />
        </div>

        <Group label="Shape">
          {SHAPES.map((shape) => (
            <Choice key={shape} name={shape} selected={look.shape === shape} cost={isOwned("shape", shape) ? 0 : price("shape", shape)} onPick={() => (isOwned("shape", shape) ? onChange({ ...look, shape }) : onShop("shape"))}>
              <Avatar look={{ ...look, shape }} size="md" />
            </Choice>
          ))}
        </Group>
        <Group label="Eyes">
          {EYES.map((eyes) => (
            <Choice key={eyes} name={eyes} selected={look.eyes === eyes} cost={isOwned("eyes", eyes) ? 0 : price("eyes", eyes)} onPick={() => (isOwned("eyes", eyes) ? onChange({ ...look, eyes }) : onShop("eyes"))}>
              <Avatar look={{ ...look, eyes }} size="md" />
            </Choice>
          ))}
        </Group>
        <Group label="Mouth">
          {MOUTHS.map((mouth) => (
            <Choice key={mouth} name={mouth} selected={look.mouth === mouth} cost={isOwned("mouth", mouth) ? 0 : price("mouth", mouth)} onPick={() => (isOwned("mouth", mouth) ? onChange({ ...look, mouth }) : onShop("mouth"))}>
              <Avatar look={{ ...look, mouth }} size="md" />
            </Choice>
          ))}
        </Group>
        <Group label="Skin">
          {SKINS.map((skin) => (
            <Choice key={skin} name={skin} selected={look.skin === skin} cost={isOwned("skin", skin) ? 0 : price("skin", skin)} onPick={() => (isOwned("skin", skin) ? onChange({ ...look, skin }) : onShop("skin"))}>
              <Avatar look={{ ...look, skin }} size="md" />
            </Choice>
          ))}
        </Group>
        <Group label="Hat">
          {HATS.map((hat) => (
            <Choice key={hat} name={hat} selected={look.hat === hat} cost={isOwned("hat", hat) ? 0 : price("hat", hat)} onPick={() => (isOwned("hat", hat) ? onChange({ ...look, hat }) : onShop("hat"))}>
              <Avatar look={{ ...look, hat }} size="md" />
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

        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={() => onShop("shape")}>
            Store
          </button>
          <button className="btn btn-primary flex-1" onClick={onClose}>
            Done
          </button>
        </div>
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

function Choice({ name, selected, cost = 0, onPick, children }: { name: string; selected: boolean; cost?: number; onPick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onPick}
      aria-label={cost ? `${name}, locked, ${cost} coins` : name}
      aria-pressed={selected}
      className={`relative grid size-14 place-items-center rounded-2xl border-2 bg-surface2 ${selected ? "border-accent" : "border-transparent"}`}
    >
      <span className={cost ? "opacity-50" : ""}>{children}</span>
      {cost > 0 && <span className="absolute -bottom-1 -right-1 rounded-full bg-black/70 px-1.5 text-[0.65rem] font-black">🔒</span>}
    </button>
  );
}
