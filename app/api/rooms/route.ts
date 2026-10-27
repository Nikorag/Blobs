import { createRoom } from "@/lib/game/engine";
import { errorResponse, playerIdFrom, readJson } from "@/lib/server/http";
import { randomCode, store } from "@/lib/server/store";

/** Create a room with the caller as host. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const playerId = playerIdFrom(body.playerId);
    const name = typeof body.name === "string" ? body.name : "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const room = createRoom(randomCode(), playerId, name, Date.now());
      if (await store.put(room, 0)) return Response.json({ code: room.code });
    }
    return Response.json({ error: "Couldn't allocate a room, try again" }, { status: 503 });
  } catch (err) {
    return errorResponse(err);
  }
}
