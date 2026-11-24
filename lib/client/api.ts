import type { Action, RoomView } from "@/lib/game/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("You appear to be offline", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong", res.status);
  return data as T;
}

/** The secret goes in a header, never the URL, so it stays out of logs. */
const SECRET_HEADER = "x-player-secret";

const post = (url: string, secret: string, body: unknown) =>
  request<never>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", [SECRET_HEADER]: secret },
    body: JSON.stringify(body),
  });

export const createRoom = (playerId: string, name: string) =>
  post("/api/rooms", playerId, { name }) as Promise<{ code: string }>;

export const joinRoom = (code: string, playerId: string, name: string) =>
  post(`/api/rooms/${code}/join`, playerId, { name }) as Promise<{ code: string }>;

export const sendAction = (code: string, playerId: string, action: Action) =>
  post(`/api/rooms/${code}/action`, playerId, { action }) as Promise<{ view: RoomView }>;

/**
 * `playerId` is the device's secret (see lib/client/identity.ts), never shown to anyone else.
 * Pass `null` to poll as The Board (a read-only spectator).
 */
export const pollRoom = (code: string, playerId: string | null, version: number) =>
  request<{ view?: RoomView; unchanged?: boolean; now?: number }>(
    `/api/rooms/${code}?${playerId === null ? "board=1&" : ""}v=${version}`,
    playerId === null ? undefined : { headers: { [SECRET_HEADER]: playerId } },
  );
