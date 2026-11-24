# Blobs: technical design

Operational notes for the online (multiplayer) backend. Gameplay and local setup are in the [README](README.md).

## Storage backend

Online rooms live in Redis, reached over HTTPS through [Webdis](https://webd.is). Vercel functions share no memory, so there is no other place for a room to live. Solo games run entirely in the browser and don't touch this.

- Code: `lib/server/store.ts`. Rooms are stored as JSON under `blobs:room:<CODE>` with a 24 h TTL. Writes use a Lua compare-and-set (`EVAL`) on the room's `version`, so two simultaneous actions can't overwrite each other.
- Rate-limit counters live under `blobs:rl:*` (see `lib/server/rateLimit.ts`), expiring after 60 s.
- **Production without `WEBDIS_URL` fails**: every API call returns a 502 storage error and `/api/health` returns 503. It does not fall back to memory. Memory storage is only used locally and on Vercel previews (one instance, so it is unreliable there).

### Commands Webdis must allow

| Command | Used for |
| --- | --- |
| `GET` | reading a room, reading rate-limit counters |
| `EVAL` | compare-and-set room writes, rate-limit counters |
| `PING` | the health check |

### Configuration (Vercel project environment variables)

| Variable | Purpose |
| --- | --- |
| `WEBDIS_URL` | Webdis base URL. Required in production. |
| `WEBDIS_USERNAME` / `WEBDIS_PASSWORD` | HTTP basic auth, if Webdis uses it |
| `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` | Cloudflare Access service token, if Webdis sits behind Access |
| `WEBDIS_HEADERS` | Extra headers as a JSON object |

### Where it runs, who owns it

> **Owner to fill in.** The repo doesn't record these and they must not be guessed.
>
> - Host / provider of the Webdis + Redis server:
> - Owner and escalation contact:
> - Cloudflare Access application and policy name (and which service token Blobs uses):
> - Redis persistence (RDB/AOF) and `maxmemory` / eviction policy. Rooms are disposable, but an eviction policy that drops keys mid-game would lose live tables, so prefer `noeviction` or a generous limit:
> - Backups: none needed for rooms (24 h TTL); the host config should be reproducible.

### Rotating credentials

1. Create the new Cloudflare Access service token (or Webdis password) alongside the old one.
2. Update `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` (or `WEBDIS_PASSWORD`) in the Vercel project for Production (and Preview if used).
3. Redeploy, check `GET /api/health` returns `{"ok":true,"store":"webdis"}`.
4. Revoke the old token.

## Health check and monitoring

`GET /api/health` runs a Webdis `PING` with a 2.5 s timeout.

- `200 {"ok":true,"store":"webdis"}`: the site and storage are up.
- `503 {"ok":false,"error":"..."}`: storage is unreachable, rejecting credentials, or `WEBDIS_URL` is missing. The body never contains URLs, usernames, tokens or header values; details go to the function log.

Point an uptime monitor at `/api/health` in production **as well as** the home page, so "site up but storage broken" pages someone before players notice.
