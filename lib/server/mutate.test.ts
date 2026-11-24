import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoom, GameError, joinRoom } from "@/lib/game/engine";
import { ConflictError, mutateRoom, normaliseCode, randomCode, store } from "./store";

beforeEach(() => {
  const g = globalThis as { __blobsStore?: unknown; __blobsRooms?: Map<string, unknown> };
  delete g.__blobsStore;
  g.__blobsRooms?.clear();
  vi.stubEnv("WEBDIS_URL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("memory store", () => {
  it("only writes when the stored version matches", async () => {
    const room = createRoom("AAAA", "h", "Host", 0);
    expect(await store.put(room, 1)).toBe(false); // nothing stored yet, so only 0 is allowed
    expect(await store.put(room, 0)).toBe(true);
    expect(await store.put(room, 0)).toBe(false);
    expect(await store.get("AAAA")).toEqual(room);
    expect(await store.version("AAAA")).toBe(1);
    expect(await store.get("BBBB")).toBeNull();
    expect(await store.version("BBBB")).toBeNull();
  });

  it("expires rooms and counters after their TTL", async () => {
    vi.useFakeTimers();
    await store.put(createRoom("AAAA", "h", "Host", 0), 0);
    expect(await store.incr("x", 60)).toBe(1);
    expect(await store.incr("x", 60)).toBe(2);
    expect(await store.peek("x")).toBe(2);
    vi.advanceTimersByTime(61_000);
    expect(await store.peek("x")).toBe(0);
    expect(await store.incr("x", 60)).toBe(1);
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(await store.get("AAAA")).toBeNull();
    expect(await store.version("AAAA")).toBeNull();
  });

  it("pings as memory", async () => {
    expect(await store.ping(100)).toBe("memory");
  });
});

describe("mutateRoom", () => {
  it("returns null for a missing room", async () => {
    expect(await mutateRoom("ZZZZ", () => 1)).toBeNull();
  });

  it("applies the change, bumps the version and returns fn's result", async () => {
    await store.put(createRoom("AAAA", "h", "Host", 0), 0);
    const out = await mutateRoom("AAAA", (room) => {
      joinRoom(room, "guest-0001", "Guest");
      return "joined";
    });
    expect(out?.result).toBe("joined");
    expect(out?.room.version).toBe(2);
    expect((await store.get("AAAA"))?.players).toHaveLength(2);
  });

  it("doesn't rewrite (or bump the version of) a room that didn't change", async () => {
    await store.put(createRoom("AAAA", "h", "Host", 0), 0);
    const put = vi.spyOn(store, "put");
    const out = await mutateRoom("AAAA", () => "nothing");
    expect(out?.room.version).toBe(1);
    expect(put).not.toHaveBeenCalled();
  });

  it("propagates errors from fn without writing", async () => {
    await store.put(createRoom("AAAA", "h", "Host", 0), 0);
    await expect(mutateRoom("AAAA", () => { throw new GameError("nope"); })).rejects.toThrow("nope");
    expect((await store.get("AAAA"))?.version).toBe(1);
  });

  it("retries when another writer got in between, and applies both changes", async () => {
    await store.put(createRoom("AAAA", "h", "Host", 0), 0);
    let first = true;
    const a = mutateRoom("AAAA", async (room) => {
      room.roundNumber = 5; // marker for writer A
    });
    const b = mutateRoom("AAAA", (room) => {
      if (first) first = false;
      joinRoom(room, "guest-0002", "Guest");
    });
    await Promise.all([a, b]);
    const room = (await store.get("AAAA"))!;
    expect(room.roundNumber).toBe(5);
    expect(room.players).toHaveLength(2);
    expect(room.version).toBe(3);
  });

  it("gives up with a ConflictError when every attempt loses the race", async () => {
    await store.put(createRoom("AAAA", "h", "Host", 0), 0);
    const put = vi.spyOn(store, "put").mockResolvedValue(false);
    await expect(mutateRoom("AAAA", (room) => { room.roundNumber += 1; })).rejects.toBeInstanceOf(ConflictError);
    expect(put).toHaveBeenCalledTimes(6);
  });
});

describe("codes", () => {
  it("normalises whatever the user typed", () => {
    expect(normaliseCode(" ab-cd9ef ")).toBe("ABCD");
    expect(normaliseCode("x")).toBe("X");
  });
  it("makes codes that are all different enough", () => {
    expect(new Set(Array.from({ length: 300 }, randomCode)).size).toBeGreaterThan(250);
  });
});
