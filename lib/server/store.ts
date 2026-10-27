import type { Room } from "@/lib/game/types";

const TTL_SECONDS = 60 * 60 * 24;
const key = (code: string) => `blobs:room:${code}`;

interface Store {
  get(code: string): Promise<Room | null>;
  /** Write `room` only if the stored version still equals `expectedVersion` (0 = must not exist). */
  put(room: Room, expectedVersion: number): Promise<boolean>;
}

const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if cur then
  if cjson.decode(cur).version ~= tonumber(ARGV[1]) then return 0 end
elseif tonumber(ARGV[1]) ~= 0 then
  return 0
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;

/**
 * Minimal Webdis client. Webdis (https://webd.is) exposes Redis over HTTP: a POST whose body is
 * `COMMAND/arg1/arg2` (each arg percent-encoded) runs that command and replies with `{"COMMAND": result}`.
 * Basic auth: set WEBDIS_USERNAME / WEBDIS_PASSWORD (or embed them in the URL as https://user:pass@host).
 * Behind Cloudflare Access, set CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET (a service token);
 * WEBDIS_HEADERS (a JSON object) adds any other headers.
 */
function webdisStore(rawUrl: string): Store {
  const url = new URL(rawUrl);
  const headers: Record<string, string> = {};
  const user = process.env.WEBDIS_USERNAME ?? decodeURIComponent(url.username);
  const password = process.env.WEBDIS_PASSWORD ?? decodeURIComponent(url.password);
  if (user) headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  // fetch() rejects URLs with embedded credentials.
  url.username = "";
  url.password = "";
  const { CF_ACCESS_CLIENT_ID: cfId, CF_ACCESS_CLIENT_SECRET: cfSecret, WEBDIS_HEADERS: extra } = process.env;
  if (cfId && cfSecret) {
    headers["CF-Access-Client-Id"] = cfId;
    headers["CF-Access-Client-Secret"] = cfSecret;
  }
  if (extra) {
    try {
      Object.assign(headers, JSON.parse(extra));
    } catch {
      throw new StoreError("WEBDIS_HEADERS is not valid JSON.");
    }
  }
  const endpoint = url.toString();

  async function command(...args: (string | number)[]): Promise<unknown> {
    const name = String(args[0]);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: args.map((a) => encodeURIComponent(String(a))).join("/"),
        cache: "no-store",
        redirect: "manual",
      });
    } catch (err) {
      const cause = (err as { cause?: { code?: string } }).cause?.code ?? (err as Error).message;
      throw new StoreError(`Can't reach Webdis (${cause}). Check WEBDIS_URL.`);
    }
    // Cloudflare Access redirects unauthenticated requests to a login page.
    if (res.status >= 300 && res.status < 400) {
      throw new StoreError(`Webdis redirected (HTTP ${res.status}), likely to a Cloudflare Access login. Check CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET and the Access policy.`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new StoreError(`Webdis rejected the credentials (HTTP ${res.status}). Check WEBDIS_USERNAME / WEBDIS_PASSWORD and the Cloudflare Access service token.`);
    }
    if (!res.ok) throw new StoreError(`Webdis ${name} failed with HTTP ${res.status}.`);
    let reply: Record<string, unknown>;
    try {
      reply = (await res.json()) as Record<string, unknown>;
    } catch {
      throw new StoreError(`Webdis returned a non-JSON response (${res.headers.get("content-type") ?? "unknown type"}). Is WEBDIS_URL pointing at Webdis?`);
    }
    const result = reply[name.toUpperCase()] ?? Object.values(reply)[0];
    // Redis errors come back as [false, "message"].
    if (Array.isArray(result) && result[0] === false) throw new StoreError(`Webdis ${name} error: ${result[1]}`);
    return result;
  }

  return {
    async get(code) {
      const raw = await command("GET", key(code));
      return typeof raw === "string" ? (JSON.parse(raw) as Room) : null;
    },
    async put(room, expectedVersion) {
      const ok = await command("EVAL", CAS_SCRIPT, 1, key(room.code), expectedVersion, JSON.stringify(room), TTL_SECONDS);
      return ok === 1;
    },
  };
}

/** Single-process fallback so `npm run dev` works with no setup. Not safe across serverless instances. */
function memoryStore(): Store {
  const g = globalThis as unknown as { __blobsRooms?: Map<string, { json: string; exp: number }> };
  const rooms = (g.__blobsRooms ??= new Map());
  return {
    async get(code) {
      const hit = rooms.get(code);
      if (!hit) return null;
      if (hit.exp < Date.now()) {
        rooms.delete(code);
        return null;
      }
      return JSON.parse(hit.json) as Room;
    },
    async put(room, expectedVersion) {
      const hit = rooms.get(room.code);
      const current = hit && hit.exp >= Date.now() ? (JSON.parse(hit.json) as Room).version : 0;
      if (current !== expectedVersion) return false;
      rooms.set(room.code, { json: JSON.stringify(room), exp: Date.now() + TTL_SECONDS * 1000 });
      return true;
    },
  };
}

function createStore(): Store {
  const url = process.env.WEBDIS_URL;
  if (url) return webdisStore(url);
  if (process.env.VERCEL) {
    console.warn(
      "[blobs] WEBDIS_URL is not set. Using in-memory storage, which will not work reliably on Vercel.",
    );
  }
  return memoryStore();
}

const g = globalThis as unknown as { __blobsStore?: Store };
// Created on first use so configuration errors surface as normal API errors.
const backend = () => (g.__blobsStore ??= createStore());
export const store: Store = {
  get: (code) => backend().get(code),
  put: (room, expected) => backend().put(room, expected),
};

export class ConflictError extends Error {}

/** The storage backend is unreachable or rejected us. The message is safe to show (no secrets). */
export class StoreError extends Error {}

/**
 * Read-modify-write a room with optimistic concurrency. `fn` may mutate the room freely
 * (it throws to abort). Retries when another request wrote in between.
 */
export async function mutateRoom<T>(
  code: string,
  fn: (room: Room) => T,
): Promise<{ room: Room; result: T } | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const room = await store.get(code);
    if (!room) return null;
    const expected = room.version;
    const before = JSON.stringify(room);
    const result = fn(room);
    // Skip the write (and the version bump every poller would then re-download) if nothing changed.
    if (JSON.stringify(room) === before) return { room, result };
    room.version = expected + 1;
    if (await store.put(room, expected)) return { room, result };
  }
  throw new ConflictError("Too many people acting at once, try again");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function randomCode(): string {
  let out = "";
  for (let i = 0; i < 4; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}
