import { joinRoom } from "@/lib/game/engine";
import { errorResponse, notFound, playerIdFrom, readJson } from "@/lib/server/http";
import { JOIN_LIMIT, missesExhausted, rateLimit, recordMiss, tooMany } from "@/lib/server/rateLimit";
import { mutateRoom, normaliseCode } from "@/lib/server/store";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  try {
    const limited = await rateLimit(request, "join", JOIN_LIMIT);
    if (limited) return limited;
    if (await missesExhausted(request)) return tooMany();
    const { code } = await ctx.params;
    const body = await readJson(request);
    const playerId = playerIdFrom(request);
    const name = typeof body.name === "string" ? body.name : "";
    const outcome = await mutateRoom(normaliseCode(code), (room) => joinRoom(room, playerId, name));
    if (!outcome) {
      await recordMiss(request);
      return notFound();
    }
    return Response.json({ code: outcome.room.code });
  } catch (err) {
    return errorResponse(err);
  }
}
