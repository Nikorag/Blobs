import { describe, expect, it } from "vitest";
import { createRoom } from "@/lib/game/engine";
import { parseSave } from "./save";

function validSave() {
  const room = createRoom("SOLO", "you", "Me", 0);
  room.players.push({ id: "cpu-000001", name: "Bot", ready: true, look: room.players[0].look, hand: [], bot: "easy" });
  return { config: { name: "Me", bots: [{ name: "Bot", level: "easy" }] }, room, memory: { round: 1, tricks: [] } };
}

describe("parseSave", () => {
  it("accepts a good save", () => {
    const save = validSave();
    expect(parseSave(JSON.stringify(save))?.room.code).toBe("SOLO");
  });

  it("rejects non-JSON, wrong shapes and damaged saves instead of throwing", () => {
    expect(parseSave("not json")).toBeNull();
    expect(parseSave("null")).toBeNull();
    expect(parseSave("[]")).toBeNull();
    expect(parseSave("{}")).toBeNull();
    const noPlayers = validSave() as unknown as { room: Record<string, unknown> };
    delete noPlayers.room.players;
    expect(parseSave(JSON.stringify(noPlayers))).toBeNull();
    const badSeat = validSave();
    (badSeat.room.players[1] as unknown as Record<string, unknown>).hand = "oops";
    expect(parseSave(JSON.stringify(badSeat))).toBeNull();
    const noMemory = validSave() as unknown as Record<string, unknown>;
    delete noMemory.memory;
    expect(parseSave(JSON.stringify(noMemory))).toBeNull();
    const noHistory = validSave() as unknown as { room: Record<string, unknown> };
    delete noHistory.room.history;
    expect(parseSave(JSON.stringify(noHistory))).toBeNull();
  });
});
