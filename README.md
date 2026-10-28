# Blobs

A multiplayer trick-calling card game for phones, built with Next.js and ready to host on Vercel.

Everyone says up front how many tricks they'll win. Then you play it out: follow suit, highest card wins, trumps beat everything. Hit your call exactly and you score it. Miss — over *or* under — and you're blobbed (−1).

## How it plays

- 2–8 players. Create a game, share the 4-letter code (or the invite link) and everyone joins from their own phone.
- Round one deals 7 cards each (fewer with 8 players, so the deck never runs out), then 6, 5 … down to 1. A card is turned up for trumps.
- The player after the dealer calls first; the dealer calls last and **can't make the total equal the number of tricks**.
- You must follow suit if you can. The trick winner leads the next one.
- Your device remembers who you are, so refreshing or reopening the link drops you back at the table.

## Playing against the computer

**Play vs CPU** on the home screen deals you in against three computer players, each set to Easy, Normal or Hard. The game runs entirely in your browser (no server or Redis involved), saves after every move, and can be resumed from the home screen.

The bots only know what a human at the table could: their own hand, the trump, the calls and the cards played so far.

| Level | How it plays |
| --- | --- |
| Easy | Calls from a rough high-card count with some noise, plays sensibly but not carefully, and occasionally throws a random card. |
| Normal | Counts cards and infers who is out of which suit. Estimates each card's chance of winning, calls the number of tricks it's most likely to hit exactly, then plays whichever card gives the best chance of finishing on that number. |
| Hard | For every call and card it considers, deals the unseen cards out at random (respecting known voids), plays the rest of the round against Normal opponents, and picks the option with the best average score. Runs in a Web Worker for about 0.4s per move. |

The AI lives in `lib/ai/` as pure functions and the local game controller is in `lib/solo/`. To check relative strength, run `TOURNAMENT=1 npx vitest run lib/ai/ai.test.ts` (set `GAMES`, `ROWS` and `BUDGET` to taste). In a 120-game run Hard hit its call 64% of the time against three Normal bots (Normal hits about 43%) and won the game 56% of the time, where 25% would be even.

## Running locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. With no Redis configured, game state is held in memory, which is fine for one dev server. To test with friends on your network, open `http://<your-ip>:3000` on their phones.

```bash
npm test          # rules engine tests
npm run lint
npm run typecheck
npm run build
```

## Deploying to Vercel

1. Push the repo and import it in Vercel (no build settings needed).
2. Add an environment variable `WEBDIS_URL` pointing at your [Webdis](https://webd.is) instance, e.g. `https://webdis.example.com/`. If it uses HTTP basic auth, also set `WEBDIS_USERNAME` and `WEBDIS_PASSWORD` (sent as the `Authorization` header). Webdis must allow `GET` and `EVAL`.
   If Webdis is behind Cloudflare Access, create a service token and set `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`; they are sent as the `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers. `WEBDIS_HEADERS` (a JSON object) can add any other headers.
3. Deploy.

Redis (via Webdis) is required in production: serverless functions don't share memory, so without it players would land on different instances and see different games. Rooms expire 24 hours after their last change.

## How it works

| Piece | Where |
| --- | --- |
| Rules engine: dealing, calling, trick winner, scoring, state machine. Pure functions, no I/O. | `lib/game/` |
| Room storage with optimistic concurrency (Redis Lua compare-and-set over Webdis, or in-memory) | `lib/server/store.ts` |
| API: create / join / poll / act | `app/api/rooms/` |
| Polling + actions hook | `lib/client/useRoom.ts` |
| UI | `components/`, `app/` |

The original version used Socket.IO and a single in-memory game. Vercel functions can't hold WebSocket connections or share memory, so this version instead stores each room in Redis and clients poll `GET /api/rooms/:code?v=<version>` about once a second. If nothing changed the server answers with a tiny `{ unchanged: true }`. Actions are `POST /api/rooms/:code/action`, validated by the engine, and each player only ever receives their own hand.

The "next round" timer and trick resolution are modelled as game state rather than server timeouts (which can't exist on serverless): a finished trick stays on the table until the winner leads, and the recap advances when everyone taps continue or when its countdown expires.
