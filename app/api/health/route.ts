import { StoreError, store } from "@/lib/server/store";

/** Short enough that an uptime monitor gets an answer well inside its own timeout. */
const TIMEOUT_MS = 2500;

/**
 * Is the site up *and* can it reach its storage? For an uptime monitor.
 * The body is safe to expose: it never contains URLs, credentials or header values.
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const backend = await store.ping(TIMEOUT_MS);
    return Response.json({ ok: true, store: backend }, { headers });
  } catch (err) {
    // Only the configuration error has a message written for display; anything else stays generic.
    const configured = err instanceof StoreError && err.message.startsWith("WEBDIS_URL is not set");
    console.error("[blobs] health check failed:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, error: configured ? err.message : "Storage is unreachable or misconfigured" },
      { status: 503, headers },
    );
  }
}
