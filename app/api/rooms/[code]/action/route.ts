import { applyAction, GameError, toView } from "@/lib/game/engine";
import type { Action } from "@/lib/game/types";
import { errorResponse, notFound, playerIdFrom, readJson } from "@/lib/server/http";
import { mutateRoom, normaliseCode } from "@/lib/server/store";

const ACTION_TYPES = ["rename", "ready", "look", "emote", "kick", "start", "call", "play", "advance", "reset", "leave"];

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/action">) {
  try {
    const { code } = await ctx.params;
    const body = await readJson(request);
    const playerId = playerIdFrom(body.playerId);
    const action = body.action as Action | undefined;
    if (!action || !ACTION_TYPES.includes(action.type)) throw new GameError("Unknown action");

    const now = Date.now();
    const outcome = await mutateRoom(normaliseCode(code), (room) =>
      applyAction(room, playerId, action, { now, rng: Math.random }),
    );
    if (!outcome) return notFound();
    return Response.json({ view: toView(outcome.room, playerId, now) });
  } catch (err) {
    return errorResponse(err);
  }
}
