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

const post = (url: string, body: unknown) =>
  request<never>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const createRoom = (playerId: string, name: string) =>
  post("/api/rooms", { playerId, name }) as Promise<{ code: string }>;

export const joinRoom = (code: string, playerId: string, name: string) =>
  post(`/api/rooms/${code}/join`, { playerId, name }) as Promise<{ code: string }>;

export const sendAction = (code: string, playerId: string, action: Action) =>
  post(`/api/rooms/${code}/action`, { playerId, action }) as Promise<{ view: RoomView }>;

/** Pass `null` as the player to poll as The Board (a read-only spectator). */
export const pollRoom = (code: string, playerId: string | null, version: number) =>
  request<{ view?: RoomView; unchanged?: boolean; now?: number }>(
    `/api/rooms/${code}?${playerId === null ? "board=1" : `pid=${encodeURIComponent(playerId)}`}&v=${version}`,
  );
