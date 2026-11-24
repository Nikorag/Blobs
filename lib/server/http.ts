import { createHash } from "node:crypto";
import { GameError } from "@/lib/game/engine";
import { ConflictError, StoreError } from "./store";

/** The caller's secret was missing, malformed or doesn't belong to a seat. */
export class ForbiddenError extends Error {}

export function errorResponse(err: unknown): Response {
  if (err instanceof ForbiddenError) return Response.json({ error: err.message }, { status: 403 });
  if (err instanceof GameError) return Response.json({ error: err.message }, { status: 400 });
  if (err instanceof ConflictError) return Response.json({ error: err.message }, { status: 409 });
  if (err instanceof StoreError) {
    console.error(err.message);
    return Response.json({ error: `Storage problem: ${err.message}` }, { status: 502 });
  }
  console.error(err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export const notFound = () => Response.json({ error: "Room not found" }, { status: 404 });

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const SECRET_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export const SECRET_HEADER = "x-player-secret";

/** The public seat id for a secret. Rooms store and share only this, never the secret. */
export function publicIdFor(secret: string): string {
  return `p_${createHash("sha256").update(secret).digest("hex").slice(0, 24)}`;
}

/**
 * Authenticate a request: the secret travels in a header (so it stays out of URLs and
 * logs) and maps one-way to the public seat id the engine and every view use.
 */
export function playerIdFrom(request: Request): string {
  const secret = request.headers.get(SECRET_HEADER);
  if (!secret || !SECRET_PATTERN.test(secret)) throw new ForbiddenError("Missing or invalid player credentials");
  return publicIdFor(secret);
}
