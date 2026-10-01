# Design

## Context

`perfect-bot` shipped Pons' `7x6.book` (33.5 MB) to the browser: fetched on the first bot question,
copied into the bot worker (`postMessage` structured clone), kept there next to the solver's and the
heuristic's tables (~20 MB). On a phone the worker failed (Axiom: one `client.error` `bot.worker` at
17:50 UTC 2026-10-01, no message); the kit's `botWorkerClient` then answers every question in the page,
so the 3 s think ran on the UI thread after every tap. On a desktop the UI stays smooth (the berry
shows ~30 ms after the tap, no long tasks), so the fix is to keep the book out of the browser.

The user's standing decision: bot computing runs in the browser; the server only validates. A book
lookup is a few table reads, not computing, so it fits on the server. The user accepted that offline
play has no book, and wants every bot move (and hint) to say how it was worked out.

## Goals / Non-Goals

**Goals:** the book only on the server; the browser asks it per move; the explanation in the status
line and the hint; nothing large downloaded; no change to the kit.

**Non-goals:** offline book; server-side search or solving; explaining moves made by another
player's browser in online games; changing the kit's worker fallback (with the book gone, the
worker's memory is back to what worked before `perfect-bot`).

## Decisions

### 1. Server: `GET /book?cells=<42 digits>`

The server reads `packages/neljan-suora-bots/book/7x6.book` once at start (`Book.parse` from the bots
package; the server gets the `@neljan-suora/bots` dependency, and Render's build adds that workspace).
`cells` is the board as 42 digits, column by column, bottom up: `0` empty, `1` a berry of the side
to move, `2` one of the other side (the seats' colours and the random starting seat do not matter
to the book; with equal counts nobody could tell who is to move from colours alone). The route
validates: exactly 42 digits, no disc above an empty cell, the other side's discs = the mover's or one
more, no four in a row on the board (a finished game has no move to choose). Invalid → `400 {"error":"BAD_POSITION"}`.

Answer `200`:
`{"known":true,"outcome":1,"columns":[3]}` or `{"known":false}` (not in the book, deeper than 14 discs,
or a hole in Pons' table). `outcome` is for the side to move. Built from `Book.lookup` (best-score
columns; immediate wins first).

Limits: `express-rate-limit` per IP, 120 requests a minute (a fast watched bot game makes ~1 a
second; the hint adds a few), `standardHeaders: "draft-8"`. CORS is already handled for every route
by `configureCors`. `Cache-Control: public, max-age=86400` (the answer for a position never changes
while the book is the same). If the file is missing at start, the server logs one `server.warn`
`kind: "book"` and answers `{"known":false}` (games keep working).

Alternative: a Colyseus room message — rejected: device games have no room, and plain HTTP works
without a connection.

### 2. Client: ask the server on the page, then the worker

`askBot` (page side) becomes: if the game has ≤ 13 discs (the book holds positions up to 14, a
verdict needs the next positions too), `fetch(serverUrl + "/book?cells=…")` with a timeout of
**800 ms** (`AbortSignal.timeout`); then ask the worker with `verdict` in the `MoveRequest` when known.
The fetch is async I/O on the page and never blocks the UI. Any failure (offline, timeout, HTTP
error, bad JSON) → no verdict, no log per move; one `client.warn` `kind: "bot.book"` per visit on
the first failure, so a broken route shows up in the logs without flooding them.

The worker cannot do the fetch: the kit's `serveBotWorker` calls `answer` synchronously, and an async
answer would need a kit change.

Why 800 ms: the bot budget is 3 s; Render usually answers in 100–300 ms once awake (the start screen
wakes it). A cold server would take 30–50 s, and the move must not wait for that.

### 3. Perfect bot: a verdict from the caller, and a report of how it chose

`perfectBot.choose` takes the verdict through the request instead of its own book: the client's
`answer` passes it as `devicePlayer`'s current verdict (`setVerdict(verdict)` before `chooseMove`,
cleared after), since the kit's `chooseMove(game, budget, seed)` has no extra argument. The book
stays in the bots package for the server and the tournament CLI (which still loads it from disk and
keeps its `book` option).

How the move was chosen: the bot already reports `{ source: "book" | "solve" | "unsettled", verdict }`;
the worker's answer becomes `{ move, how: { source, outcome? } }` (`outcome` for the side that moved,
only for book and solve). The page side unwraps it: the kit gets the plain `Move`, the explanation
goes to a small client store keyed by the game's move count after the move (`moves`), so the screen
shows it only for the move it belongs to.

### 4. Status line and hint texts

- Status line, after a bot move on this device: `{{name}}: {{how}}{{outcome}}` where how is
  "kirjasta" / "laski loppuun" / "arvioi", outcome " · {{winner}} voittaa" / " · tasapeli". English:
  "from the book" / "solved" / "estimate", " · {{winner}} wins" / " · draw". It replaces "Napauta
  saraketta" / "Odota vuoroasi" while it applies; notices and a shown hint still take precedence.
  The winner is the bot's name when the outcome is a win for it, the other player's name when a loss.
- Hint: "Vihje: sarake {{column}} · kirjasta · voitat" (outcome for the asker: "voitat" / "tasapeli"
  / "häviät"); estimate: "Vihje: sarake {{column}} · arvio".
- No icons: text only keeps the status line one line on a phone (checked at 360 px; long names are
  already ellipsized by the status line).

### NFR

- **Logging:** server: one `server.warn` `kind: "book"` if the file is missing; the HTTP audit already
  logs requests (`http.request`). Client: one `client.warn` `kind: "bot.book"` per visit on the first
  failed lookup. Nothing per move.
- **Abuse:** the route validates input strictly and is rate-limited per IP (120/min); the answer is
  small and cacheable.
- **Performance:** no book download; the client bundle and worker budgets unchanged; the size-limit
  entry for the book goes. Server memory +33.5 MB.
- **Tests:** server: route tests (valid start position → column 3, unknown, bad input → 400, missing
  file → known false). Bots: the perfect bot with a given verdict, and its report. Client: the lookup
  wrapper (verdict passed, timeout/failure → none, one warning per visit, ≥ 14 discs → no request),
  the explanation store and status texts (view-model level). UI check: device game shows the
  explanation; hint shows it. E2E smoke unchanged (must pass).

## Risks / Trade-offs

- [Server asleep on the first moves] → 800 ms timeout, the bot plays without the book; the start
  screen's wake-up usually has the server ready.
- [Online games: other players see no explanation] → accepted; only the host's browser computes.
- [Book file path on Render] → the build includes the bots workspace; a task verifies `/book` on the
  deployed server (production check in the summary).

## Migration Plan

One deploy for server and client. Old clients (with the book download) keep working until reloaded.
Rollback: revert the commit.
