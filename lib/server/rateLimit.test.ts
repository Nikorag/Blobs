import { describe, expect, it } from "vitest";
import { POST as createRoom } from "@/app/api/rooms/route";
import { POST as join } from "@/app/api/rooms/[code]/join/route";
import { GET as poll } from "@/app/api/rooms/[code]/route";
import { CREATE_LIMIT, MISS_LIMIT } from "./rateLimit";
import { SECRET_HEADER } from "./http";
import { randomCode } from "./store";

const from = (ip: string, secret = "rate-limit-secret-0001") => ({ "x-forwarded-for": ip, [SECRET_HEADER]: secret, "Content-Type": "application/json" });
const ctx = (code: string) => ({ params: Promise.resolve({ code }) }) as never;

describe("rate limiting", () => {
  it("returns 429 once an IP creates too many rooms, without affecting other IPs", async () => {
    const make = (ip: string) => createRoom(new Request("http://t/api/rooms", { method: "POST", headers: from(ip), body: JSON.stringify({ name: "A" }) }));
    for (let i = 0; i < CREATE_LIMIT; i++) expect((await make("10.0.0.1")).status).toBe(200);
    expect((await make("10.0.0.1")).status).toBe(429);
    expect((await make("10.0.0.2")).status).toBe(200);
  });

  it("rate-limits probing of codes that don't exist, but not the rooms people are in", async () => {
    const ip = "10.0.0.3";
    const { code } = await (await createRoom(new Request("http://t/api/rooms", { method: "POST", headers: from("10.0.0.9"), body: "{}" }))).json();
    const probe = (c: string) => join(new Request(`http://t/api/rooms/${c}/join`, { method: "POST", headers: from(ip), body: "{}" }), ctx(c));
    for (let i = 0; i < MISS_LIMIT; i++) expect((await probe("ZZZZ")).status).toBe(404);
    expect((await probe("ZZZZ")).status).toBe(429);
    expect((await probe(code)).status).toBe(429); // can't use probing to find live codes either
    const board = await poll(new Request(`http://t/api/rooms/${code}?board=1`, { headers: from(ip) }), ctx(code));
    expect(board.status).toBe(429);
    const normal = await poll(new Request(`http://t/api/rooms/${code}?board=1`, { headers: from("10.0.0.4") }), ctx(code));
    expect(normal.status).toBe(200);
  });

  it("generates 4-letter codes from the alphabet", () => {
    for (let i = 0; i < 200; i++) expect(randomCode()).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });
});
