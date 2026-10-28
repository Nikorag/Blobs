import { syncMemory } from "@/lib/ai";
import type { BotInput } from "@/lib/ai";
import { applyAction, toView } from "@/lib/game/engine";
import type { Action, Player, RoomView } from "@/lib/game/types";
import { createSoloGame, HUMAN_ID } from "./create";
import { type SoloSave, writeSolo } from "./save";

/**
 * The mutable state of a game against the computer: the room, the public memory of the
 * round, and the opponents. Everything that changes it goes through here and is auto-saved.
 */
export class SoloEngine {
  private save: SoloSave;

  constructor(initial: SoloSave) {
    this.save = structuredClone(initial);
  }

  view(): RoomView {
    return toView(this.save.room, HUMAN_ID, Date.now());
  }

  get phase() {
    return this.save.room.phase;
  }

  /** Bots that have yet to tap Next on the recap. */
  botsAwaitingRecap(): Player[] {
    const { room } = this.save;
    return room.phase === "Recap" ? room.players.filter((p) => p.bot && !room.recapReady.includes(p.id)) : [];
  }

  /** The bot whose turn it is, with what it's allowed to know and how long a finished trick should linger first. */
  botToAct(): { id: string; input: BotInput; afterTrick: boolean } | null {
    const { room, memory } = this.save;
    if (room.phase !== "Call" && room.phase !== "Play") return null;
    const actor = room.players[room.turnIdx];
    if (!actor.bot) return null;
    return {
      id: actor.id,
      input: { view: toView(room, actor.id, Date.now()), memory: structuredClone(memory), difficulty: actor.bot },
      afterTrick: room.phase === "Play" && room.trick.length === 0 && room.lastTrick !== null,
    };
  }

  /** Apply an action for any player. Throws GameError if illegal. */
  apply(playerId: string, action: Action): void {
    applyAction(this.save.room, playerId, action, { now: Date.now(), rng: Math.random });
    this.settle();
  }

  /** Deal a fresh game against the same opponents. */
  restart(): void {
    this.save = createSoloGame(this.save.config);
    this.settle();
  }

  private settle(): void {
    const { room, memory } = this.save;
    syncMemory(room, memory);
    // Solo recaps wait for the player to tap Next rather than running a countdown.
    if (room.phase === "Recap") room.recapAt = null;
    room.version += 1;
    writeSolo(this.save);
  }
}
