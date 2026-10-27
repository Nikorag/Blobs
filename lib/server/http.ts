import { GameError } from "@/lib/game/engine";
import { ConflictError } from "./store";

export function errorResponse(err: unknown): Response {
  if (err instanceof GameError) return Response.json({ error: err.message }, { status: 400 });
  if (err instanceof ConflictError) return Response.json({ error: err.message }, { status: 409 });
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

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function playerIdFrom(value: unknown): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new GameError("Invalid player id");
  return value;
}
