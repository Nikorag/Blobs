import { newMemory, syncMemory } from "@/lib/ai";
import { shuffle } from "@/lib/game/cards";
import { applyAction, createRoom, joinRoom } from "@/lib/game/engine";
import type { SoloConfig, SoloSave } from "./save";

export const HUMAN_ID = "you";
export const botId = (i: number) => `cpu${i + 1}`;

/** A freshly dealt game against the computer. The human gets a random seat. */
export function createSoloGame(config: SoloConfig, rng: () => number = Math.random): SoloSave {
  const room = createRoom("CPU", HUMAN_ID, config.name, Date.now());
  config.bots.forEach((bot, i) => {
    joinRoom(room, botId(i), bot.name);
    const player = room.players[room.players.length - 1];
    player.bot = bot.level;
    player.ready = true;
  });
  room.players = shuffle(room.players, rng);
  applyAction(room, HUMAN_ID, { type: "start" }, { now: Date.now(), rng });
  const memory = newMemory(room.roundNumber);
  syncMemory(room, memory);
  return { config, room, memory };
}
