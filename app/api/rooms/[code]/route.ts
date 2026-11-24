import { toView } from "@/lib/game/engine";
import { errorResponse, ForbiddenError, notFound, playerIdFrom } from "@/lib/server/http";
import { missesExhausted, recordMiss, tooMany } from "@/lib/server/rateLimit";
import { normaliseCode, store } from "@/lib/server/store";

/**
 * Poll for room state. Pass `v` (the last version seen) and, if nothing changed, we
 * reply with a tiny `{ unchanged: true }` instead of the whole view.
 *
 * `board=1` is the spectator view used by The Board: no credentials needed, and no hands.
 * Everyone else authenticates with their secret in the `x-player-secret` header.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  try {
    if (await missesExhausted(request)) return tooMany();
    const { code } = await ctx.params;
    const url = new URL(request.url);
    const board = url.searchParams.get("board") === "1";
    const playerId = board ? "" : playerIdFrom(request);
    const seen = Number(url.searchParams.get("v") ?? -1);

    const roomCode = normaliseCode(code);
    const headers = { "Cache-Control": "no-store" };
    // Most polls find nothing new. Answer those from the tiny version key without downloading the
    // room. It only says "nothing changed since the version you already hold", so it leaks nothing.
    if (seen >= 0 && (await store.version(roomCode)) === seen) {
      return Response.json({ unchanged: true, now: Date.now() }, { headers });
    }

    const room = await store.get(roomCode);
    if (!room) {
      await recordMiss(request);
      return notFound();
    }
    if (!board && !room.players.some((p) => p.id === playerId)) {
      throw new ForbiddenError("You are not in this room");
    }
    if (room.version === seen) return Response.json({ unchanged: true, now: Date.now() }, { headers });
    return Response.json({ view: toView(room, playerId, Date.now()) }, { headers });
  } catch (err) {
    return errorResponse(err);
  }
}
