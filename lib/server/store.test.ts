import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { POST as createRoom } from "@/app/api/rooms/route";
import { SECRET_HEADER } from "./http";

const reset = () => {
  const g = globalThis as { __blobsStore?: unknown };
  delete g.__blobsStore;
};

beforeEach(() => {
  reset();
  vi.stubEnv("WEBDIS_URL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  reset();
});

const create = () =>
  createRoom(new Request("http://t/api/rooms", { method: "POST", headers: { [SECRET_HEADER]: "store-secret-000001", "Content-Type": "application/json" }, body: "{}" }));

describe("storage backend selection", () => {
  it("fails API calls loudly in production when WEBDIS_URL is missing", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const res = await create();
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("WEBDIS_URL is not set");
  });

  it("still uses memory for local dev and previews", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await create()).status).toBe(200);
  });
});

describe("GET /api/health", () => {
  it("reports ok with the in-memory store in dev", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, store: "memory" });
  });

  it("reports ok when Webdis answers PING", async () => {
    vi.stubEnv("WEBDIS_URL", "https://user:hunter2@webdis.internal.example/");
    const fetchMock = vi.fn(async () => Response.json({ PING: [true, "PONG"] }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, store: "webdis" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns 503 quickly when Webdis is unreachable, without leaking the URL or credentials", async () => {
    vi.stubEnv("WEBDIS_URL", "https://user:hunter2@webdis.internal.example/");
    vi.stubEnv("CF_ACCESS_CLIENT_ID", "cf-id-123");
    vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "cf-secret-456");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      // Behave like a black hole until the abort signal fires.
      await new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new Error("timed out to webdis.internal.example"))));
    }));
    const started = Date.now();
    const res = await health();
    const text = await res.text();
    expect(res.status).toBe(503);
    expect(Date.now() - started).toBeLessThan(3000);
    for (const secret of ["hunter2", "webdis.internal.example", "cf-id-123", "cf-secret-456"]) expect(text).not.toContain(secret);
  }, 10_000);

  it("returns 503 on a Webdis HTTP error", async () => {
    vi.stubEnv("WEBDIS_URL", "https://webdis.example/");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 403 })));
    expect((await health()).status).toBe(503);
  });

  it("explains a missing WEBDIS_URL in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await health();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("WEBDIS_URL is not set");
  });
});
