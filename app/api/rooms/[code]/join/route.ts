import { joinRoom } from "@/lib/game/engine";
import { errorResponse, notFound, playerIdFrom, readJson } from "@/lib/server/http";
import { mutateRoom, normaliseCode } from "@/lib/server/store";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  try {
    const { code } = await ctx.params;
    const body = await readJson(request);
    const playerId = playerIdFrom(body.playerId);
    const name = typeof body.name === "string" ? body.name : "";
    const outcome = await mutateRoom(normaliseCode(code), (room) => joinRoom(room, playerId, name));
    if (!outcome) return notFound();
    return Response.json({ code: outcome.room.code });
  } catch (err) {
    return errorResponse(err);
  }
}
