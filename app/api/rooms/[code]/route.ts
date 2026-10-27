import { toView } from "@/lib/game/engine";
import { errorResponse, notFound } from "@/lib/server/http";
import { normaliseCode, store } from "@/lib/server/store";

/**
 * Poll for room state. Pass `v` (the last version seen) and, if nothing changed, we
 * reply with a tiny `{ unchanged: true }` instead of the whole view.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  try {
    const { code } = await ctx.params;
    const url = new URL(request.url);
    const playerId = url.searchParams.get("pid") ?? "";
    const seen = Number(url.searchParams.get("v") ?? -1);

    const room = await store.get(normaliseCode(code));
    if (!room) return notFound();
    if (!room.players.some((p) => p.id === playerId)) {
      return Response.json({ error: "You are not in this room" }, { status: 403 });
    }
    const headers = { "Cache-Control": "no-store" };
    if (room.version === seen) return Response.json({ unchanged: true, now: Date.now() }, { headers });
    return Response.json({ view: toView(room, playerId, Date.now()) }, { headers });
  } catch (err) {
    return errorResponse(err);
  }
}
