import { describe, expect, it } from "vitest";
import { POST as createRoom } from "@/app/api/rooms/route";
import { POST as act } from "@/app/api/rooms/[code]/action/route";
import { POST as join } from "@/app/api/rooms/[code]/join/route";
import { GET as poll } from "@/app/api/rooms/[code]/route";
import { publicIdFor, SECRET_HEADER } from "./http";

const HOST = "host-secret-0000000001";
const GUEST = "guest-secret-000000002";

const url = (code: string, query = "") => `http://test/api/rooms/${code}${query}`;
const post = (path: string, secret: string | null, body: unknown) =>
  new Request(`http://test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(secret ? { [SECRET_HEADER]: secret } : {}) },
    body: JSON.stringify(body),
  });
const ctx = (code: string) => ({ params: Promise.resolve({ code }) }) as never;
const get = (code: string, secret: string | null, query = "") =>
  poll(new Request(url(code, query), { headers: secret ? { [SECRET_HEADER]: secret } : {} }), ctx(code));

async function table() {
  const { code } = await (await createRoom(post("/api/rooms", HOST, { name: "Host" }))).json();
  await join(post(`/api/rooms/${code}/join`, GUEST, { name: "Guest" }), ctx(code));
  return code as string;
}

describe("seat authentication", () => {
  it("hashes secrets to a public id that is not accepted as a credential", () => {
    expect(publicIdFor(HOST)).not.toContain(HOST);
    expect(publicIdFor(HOST)).toBe(publicIdFor(HOST));
    expect(publicIdFor(HOST)).not.toBe(publicIdFor(GUEST));
  });

  it("never puts a secret in any view, including the spectator board", async () => {
    const code = await table();
    for (const res of [await get(code, HOST), await get(code, GUEST), await get(code, null, "?board=1")]) {
      const text = await res.text();
      expect(res.status).toBe(200);
      expect(text).not.toContain(HOST);
      expect(text).not.toContain(GUEST);
    }
  });

  it("rejects a public id used as a credential", async () => {
    const code = await table();
    const view = await (await get(code, HOST)).json();
    const guestPublic = view.view.players.find((p: { name: string }) => p.name === "Guest").id;
    expect(guestPublic).toBe(publicIdFor(GUEST));
    expect((await get(code, guestPublic)).status).toBe(403);
    expect((await get(code, null, `?pid=${guestPublic}`)).status).toBe(403);
    const res = await act(post(`/api/rooms/${code}/action`, guestPublic, { action: { type: "ready" } }), ctx(code));
    expect(res.status).toBe(403);
  });

  it("rejects missing credentials and strangers, and lets seat owners act", async () => {
    const code = await table();
    expect((await get(code, null)).status).toBe(403);
    expect((await get(code, "stranger-secret-00000003")).status).toBe(403);
    const kick = { action: { type: "kick", playerId: publicIdFor(HOST) } };
    expect((await act(post(`/api/rooms/${code}/action`, GUEST, kick), ctx(code))).status).toBe(400);
    expect((await act(post(`/api/rooms/${code}/action`, HOST, { action: { type: "ready" } }), ctx(code))).status).toBe(200);
  });
});
