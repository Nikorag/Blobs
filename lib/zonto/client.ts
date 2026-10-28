import { ZontoClient } from "@zonto/sdk";

const TOKEN_KEY = "blobs:zonto-token";

export const ZONTO_BASE_URL = process.env.NEXT_PUBLIC_ZONTO_BASE_URL || "https://www.nikorag.co.uk";
export const ZONTO_GAME_SLUG = process.env.NEXT_PUBLIC_ZONTO_GAME_SLUG || "blobs";

export function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // private mode: the player just signs in again next launch
  }
}

let client: ZontoClient | null = null;

/** The one shared client — SDK events are per-instance, so everything must use this. */
export function getZonto(): ZontoClient {
  client ??= new ZontoClient({
    baseUrl: ZONTO_BASE_URL,
    gameSlug: ZONTO_GAME_SLUG,
    onTokenChange: writeToken,
  });
  return client;
}
