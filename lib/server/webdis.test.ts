import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoom } from "@/lib/game/engine";
import { StoreError, store } from "./store";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
const reply = (body: unknown, init?: ResponseInit) => new Response(typeof body === "string" ? body : JSON.stringify(body), init);

function useWebdis(handler: (call: Call) => Response | Promise<Response>, env: Record<string, string> = {}) {
  vi.stubEnv("WEBDIS_URL", "https://webdis.example/");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return handler(call);
  }));
}
const body = (i = 0) => decodeURIComponent(String(calls[i].init.body));

beforeEach(() => {
  calls = [];
  delete (globalThis as { __blobsStore?: unknown }).__blobsStore;
  for (const k of ["WEBDIS_USERNAME", "WEBDIS_PASSWORD", "CF_ACCESS_CLIENT_ID", "CF_ACCESS_CLIENT_SECRET", "WEBDIS_HEADERS"]) vi.stubEnv(k, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete (globalThis as { __blobsStore?: unknown }).__blobsStore;
});

describe("webdis store", () => {
  it("reads a room, and returns null when the key is missing", async () => {
    const room = createRoom("AAAA", "h", "Host", 0);
    useWebdis(({ init }) => (String(init.body).startsWith("GET/blobs%3Aroom%3AAAAA") ? reply({ GET: JSON.stringify(room) }) : reply({ GET: null })));
    expect(await store.get("AAAA")).toEqual(room);
    expect(await store.get("BBBB")).toBeNull();
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.redirect).toBe("manual");
  });

  it("writes with a compare-and-set script and reports whether it won", async () => {
    const room = createRoom("AAAA", "h", "Host", 0);
    useWebdis(() => reply({ EVAL: 1 }));
    expect(await store.put(room, 0)).toBe(true);
    expect(body()).toContain("EVAL/");
    expect(body()).toContain("/2/blobs:room:AAAA/blobs:ver:AAAA/0/");
    useWebdis(() => reply({ EVAL: 0 }));
    expect(await store.put(room, 0)).toBe(false);
  });

  it("reads versions and counters", async () => {
    useWebdis(({ init }) => (String(init.body).includes("ver") ? reply({ GET: "7" }) : String(init.body).startsWith("EVAL") ? reply({ EVAL: 3 }) : reply({ GET: "4" })));
    expect(await store.version("AAAA")).toBe(7);
    expect(await store.incr("c", 60)).toBe(3);
    expect(await store.peek("c")).toBe(4);
  });

  it("returns null for a missing version and 0 for a missing counter", async () => {
    useWebdis(() => reply({ GET: null }));
    expect(await store.version("AAAA")).toBeNull();
    expect(await store.peek("c")).toBe(0);
  });

  it("sends basic auth from env, or from credentials embedded in the URL (and strips them from the request URL)", async () => {
    useWebdis(() => reply({ PING: [true, "PONG"] }), { WEBDIS_USERNAME: "alice", WEBDIS_PASSWORD: "pw" });
    await store.ping(1000);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("alice:pw").toString("base64")}`);

    delete (globalThis as { __blobsStore?: unknown }).__blobsStore;
    calls = [];
    vi.stubEnv("WEBDIS_USERNAME", "");
    vi.stubEnv("WEBDIS_PASSWORD", "");
    vi.stubEnv("WEBDIS_URL", "https://bob:s3cret@webdis.example/");
    await store.ping(1000);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("bob:s3cret").toString("base64")}`);
    expect(calls[0].url).toBe("https://webdis.example/");
  });

  it("sends Cloudflare Access and extra headers", async () => {
    useWebdis(() => reply({ PING: [true, "PONG"] }), { CF_ACCESS_CLIENT_ID: "id", CF_ACCESS_CLIENT_SECRET: "secret", WEBDIS_HEADERS: '{"X-Extra":"1"}' });
    await store.ping(1000);
    expect(calls[0].init.headers).toMatchObject({ "CF-Access-Client-Id": "id", "CF-Access-Client-Secret": "secret", "X-Extra": "1" });
  });

  it("rejects WEBDIS_HEADERS that isn't JSON", async () => {
    useWebdis(() => reply({}), { WEBDIS_HEADERS: "{nope" });
    await expect(store.ping(1000)).rejects.toThrow(/WEBDIS_HEADERS/);
  });

  it("maps a redirect (Cloudflare Access login) to a clear StoreError", async () => {
    useWebdis(() => new Response(null, { status: 302, headers: { Location: "https://login" } }));
    await expect(store.get("AAAA")).rejects.toThrow(/Cloudflare Access/);
  });

  it.each([401, 403])("maps HTTP %i to a credentials StoreError", async (status) => {
    useWebdis(() => reply("denied", { status }));
    await expect(store.get("AAAA")).rejects.toThrow(/rejected the credentials/);
  });

  it("maps other HTTP failures, non-JSON bodies, Redis errors and network errors", async () => {
    useWebdis(() => reply("boom", { status: 500 }));
    await expect(store.get("AAAA")).rejects.toThrow(/failed with HTTP 500/);

    useWebdis(() => reply("<html>", { headers: { "content-type": "text/html" } }));
    await expect(store.get("AAAA")).rejects.toThrow(/non-JSON response \(text\/html\)/);

    useWebdis(() => reply({ GET: [false, "ERR wrong type"] }));
    await expect(store.get("AAAA")).rejects.toThrow(/ERR wrong type/);

    vi.stubGlobal("fetch", vi.fn(async () => { throw Object.assign(new Error("fetch failed"), { cause: { code: "ECONNREFUSED" } }); }));
    await expect(store.get("AAAA")).rejects.toThrow(/Can't reach Webdis \(ECONNREFUSED\)/);
    await expect(store.get("AAAA")).rejects.toBeInstanceOf(StoreError);
  });
});
