import { beforeEach, describe, expect, it } from "vitest";
import { POST as createRoom } from "@/app/api/rooms/route";
import { POST as act } from "@/app/api/rooms/[code]/action/route";
import { POST as join } from "@/app/api/rooms/[code]/join/route";
import { GET as poll } from "@/app/api/rooms/[code]/route";
import { SECRET_HEADER } from "./http";

const A = "route-secret-aaaaaaaa";
const B = "route-secret-bbbbbbbb";
const C = "route-secret-cccccccc";
let ip = 0;

const ctx = (code: string) => ({ params: Promise.resolve({ code }) }) as never;
const headers = (secret: string | null, forIp: string) => ({ "Content-Type": "application/json", "x-forwarded-for": forIp, ...(secret ? { [SECRET_HEADER]: secret } : {}) });
type Handler = (request: Request, ctx: never) => Promise<Response>;
const call = (handler: Handler, path: string, secret: string | null, body: unknown, code = "") =>
  handler(new Request(`http://t${path}`, { method: "POST", headers: headers(secret, `9.9.9.${ip}`), body: typeof body === "string" ? body : JSON.stringify(body) }), ctx(code));
const getRoom = (code: string, secret: string | null, query = "") =>
  poll(new Request(`http://t/api/rooms/${code}${query}`, { headers: headers(secret, `9.9.9.${ip}`) }), ctx(code));
const doAct = (code: string, secret: string | null, action: unknown) => call(act, `/api/rooms/${code}/action`, secret, { action }, code);

async function table() {
  const { code } = await (await call(createRoom, "/api/rooms", A, { name: "Alice" })).json();
  for (const [secret, name] of [[B, "Bob"], [C, "Cat"]]) await call(join, `/api/rooms/${code}/join`, secret, { name }, code);
  for (const secret of [B, C]) await doAct(code, secret, { type: "ready", ready: true });
  expect((await doAct(code, A, { type: "start" })).status).toBe(200);
  return code as string;
}

beforeEach(() => {
  ip += 1; // a fresh caller for each test so rate limits never interfere
});

describe("POST /api/rooms", () => {
  it("creates a room with the caller as host and a clean name", async () => {
    const res = await call(createRoom, "/api/rooms", A, { name: "  Alice   the   Great and Terrible  " });
    expect(res.status).toBe(200);
    const { code } = await res.json();
    expect(code).toMatch(/^[A-Z]{4}$/);
    const view = (await (await getRoom(code, A)).json()).view;
    expect(view.players[0].name).toBe("Alice the Great ");
    expect(view.players[0].isHost).toBe(true);
  });

  it("rejects missing credentials, and tolerates a junk body", async () => {
    expect((await call(createRoom, "/api/rooms", null, { name: "x" })).status).toBe(403);
    expect((await call(createRoom, "/api/rooms", "short", { name: "x" })).status).toBe(403);
    expect((await call(createRoom, "/api/rooms", A, "not json")).status).toBe(200);
  });
});

describe("POST /api/rooms/:code/join", () => {
  it("joins, is idempotent, and normalises the code", async () => {
    const { code } = await (await call(createRoom, "/api/rooms", A, {})).json();
    const lower = `${code.toLowerCase()}`;
    expect((await call(join, `/api/rooms/${lower}/join`, B, { name: "Bob" }, lower)).status).toBe(200);
    expect((await call(join, `/api/rooms/${code}/join`, B, { name: "Bob" }, code)).status).toBe(200);
    const view = (await (await getRoom(code, A)).json()).view;
    expect(view.players).toHaveLength(2);
  });

  it("404s on an unknown room, 403s without credentials, 400s when the game has started or the room is full", async () => {
    expect((await call(join, "/api/rooms/ZZZZ/join", B, {}, "ZZZZ")).status).toBe(404);
    const code = await table();
    expect((await call(join, `/api/rooms/${code}/join`, null, {}, code)).status).toBe(403);
    const late = await call(join, `/api/rooms/${code}/join`, "route-secret-late0000", { name: "Late" }, code);
    expect(late.status).toBe(400);
    expect((await late.json()).error).toMatch(/already started/);

    const { code: full } = await (await call(createRoom, "/api/rooms", A, {})).json();
    for (let i = 0; i < 7; i++) expect((await call(join, `/api/rooms/${full}/join`, `route-secret-fill${i}000`, {}, full)).status).toBe(200);
    const over = await call(join, `/api/rooms/${full}/join`, "route-secret-over0000", {}, full);
    expect((await over.json()).error).toMatch(/full/);
  });
});

describe("POST /api/rooms/:code/action", () => {
  it("rejects unknown and malformed actions with 400", async () => {
    const code = await table();
    expect((await doAct(code, A, { type: "teleport" })).status).toBe(400);
    expect((await doAct(code, A, null)).status).toBe(400);
    expect((await call(act, `/api/rooms/${code}/action`, A, "not json", code)).status).toBe(400);
    expect((await doAct(code, A, { type: "call", value: 99 })).status).toBe(400);
    expect((await doAct(code, A, { type: "botTurn" })).status).toBe(200); // a harmless no-op
  });

  it("404s on an unknown room and 403s for someone who isn't seated", async () => {
    expect((await doAct("ZZZZ", A, { type: "ready", ready: true })).status).toBe(404);
    const code = await table();
    expect((await doAct(code, "route-secret-stranger", { type: "emote", emote: "gg" })).status).toBe(403);
  });

  it("enforces turn order and rules through the engine (409/400 never leak state)", async () => {
    const code = await table();
    const views = await Promise.all([A, B, C].map(async (s) => (await (await getRoom(code, s)).json()).view));
    const notMe = views.find((v) => v.turnId !== v.you)!;
    const secret = { [(views[0] as { you: string }).you]: A, [(views[1] as { you: string }).you]: B, [(views[2] as { you: string }).you]: C }[notMe.you]!;
    const res = await doAct(code, secret, { type: "call", value: 0 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/your turn/);
  });
});

describe("GET /api/rooms/:code", () => {
  it("404s for a missing room and 403s for non-members or missing credentials", async () => {
    expect((await getRoom("ZZZZ", A)).status).toBe(404);
    const code = await table();
    expect((await getRoom(code, "route-secret-stranger")).status).toBe(403);
    expect((await getRoom(code, null)).status).toBe(403);
  });

  it("never shows anyone another player's hand, including on the Board", async () => {
    const code = await table();
    const mine = Object.fromEntries(await Promise.all([A, B, C].map(async (s) => [s, (await (await getRoom(code, s)).json()).view])));
    for (const secret of [A, B, C]) {
      const view = mine[secret];
      expect(view.myHand.length).toBeGreaterThan(0);
      expect(view.players.every((p: { handCount: number }) => p.handCount > 0)).toBe(true);
      expect(Object.keys(view)).not.toContain("hands");
      const text = JSON.stringify(view);
      for (const other of [A, B, C].filter((s) => s !== secret)) {
        for (const card of mine[other].myHand) {
          if (!view.myHand.some((c: { rank: number; suit: string }) => c.rank === card.rank && c.suit === card.suit) && !(view.trump && view.trump.rank === card.rank && view.trump.suit === card.suit)) {
            expect(text).not.toContain(JSON.stringify(card));
          }
        }
      }
    }
    const board = await (await getRoom(code, null, "?board=1")).json();
    expect(board.view.myHand).toEqual([]);
    for (const secret of [A, B, C]) for (const card of mine[secret].myHand) {
      if (!(board.view.trump && board.view.trump.rank === card.rank && board.view.trump.suit === card.suit)) expect(JSON.stringify(board.view)).not.toContain(JSON.stringify(card));
    }
  });

  it("replies unchanged for the current version and a full view otherwise", async () => {
    const code = await table();
    const view = (await (await getRoom(code, A)).json()).view;
    const same = await (await getRoom(code, A, `?v=${view.version}`)).json();
    expect(same.unchanged).toBe(true);
    expect(typeof same.now).toBe("number");
    expect((await (await getRoom(code, A, `?v=${view.version - 1}`)).json()).view.version).toBe(view.version);
  });
});
