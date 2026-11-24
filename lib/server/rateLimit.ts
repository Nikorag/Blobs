import { store } from "./store";

const WINDOW_SECONDS = 60;

/** Room creations per IP per minute. */
export const CREATE_LIMIT = 10;
/** Join attempts per IP per minute. */
export const JOIN_LIMIT = 30;
/** Lookups of rooms that don't exist, per IP per minute. Stops code sweeping. */
export const MISS_LIMIT = 10;

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export const tooMany = () =>
  Response.json({ error: "Too many requests, slow down and try again in a minute" }, { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } });

/** Count a hit against `bucket` for this caller. Returns a 429 response once over `max`, else null. */
export async function rateLimit(request: Request, bucket: string, max: number): Promise<Response | null> {
  try {
    const n = await store.incr(`${bucket}:${clientIp(request)}`, WINDOW_SECONDS);
    return n > max ? tooMany() : null;
  } catch {
    return null; // never block play because the counter is unavailable
  }
}

/** True if this caller has already used up its misses (without counting a new one). */
export async function missesExhausted(request: Request): Promise<boolean> {
  try {
    return (await store.peek(`miss:${clientIp(request)}`)) >= MISS_LIMIT;
  } catch {
    return false;
  }
}

/** Record a lookup of a room that doesn't exist. */
export async function recordMiss(request: Request): Promise<void> {
  try {
    await store.incr(`miss:${clientIp(request)}`, WINDOW_SECONDS);
  } catch {
    // ignore
  }
}
