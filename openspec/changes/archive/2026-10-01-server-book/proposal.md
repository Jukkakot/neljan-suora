# Proposal

## Why

The perfect bot's opening book (Pascal Pons' `7x6.book`, 33.5 MB) is downloaded into the bot worker.
On a phone the worker crashed (most likely out of memory: the book, its copy on the way in and the
search tables), and the kit then answers every bot move on the page's UI thread: after each tap the
UI froze for about 3 s before the berry even started to drop. Looking a position up in the book is
cheap (a few table reads), so the server can hold the book and answer lookups, while the heavy part
(solving and the heuristic search) stays in the player's browser as decided for all bots. The user
also wants to see how each bot move was worked out.

## What Changes

- The **server** loads the book once at start and answers `GET /book` lookups for positions of up
  to 14 discs: the outcome and the columns of the best score, or "not in the book". Rate-limited per
  IP like the client logs.
- The **client** no longer downloads the book. Before asking the bot worker, the page asks the server
  for the position's verdict (short timeout); the worker gets the verdict with the question and only
  chooses among its columns, or solves / searches as today when there is none. Offline, or with the
  server asleep or slow, the bot plays without the book (accepted by the user).
- The **status line** says how the last bot move was worked out, in three levels: from the book,
  solved to the end, or an estimate; when the outcome is certain (book or solve) it also says who
  wins or that it is a draw. "Vihje" says the same about its column.
- Removed: the book fetch, its runtime cache route and size-limit entry, and the "loaded on demand"
  requirement.

## Capabilities

### New Capabilities

- `bot-explanation`: the status line and the hint tell how the bot's move was worked out (book,
  solved, estimate) and the certain outcome.

### Modified Capabilities

- `bot-play`: the opening book is looked up on the server instead of loaded into the browser; the
  fallback when the lookup fails; "The opening book is loaded on demand" is removed.

## Impact

- **Workspaces**: `server` (book loading, `/book` route, rate limit; the book file reaches the
  server build), `packages/neljan-suora-bots` (perfect bot takes a verdict from the caller; reports
  how it chose), `client` (lookup before the worker, explanation store, status line and hint texts,
  removal of the book download), `packages/rules` unchanged.
- **API**: new `GET /book?cells=…` on the game server (JSON).
- **Memory**: server +33.5 MB (Render free tier: 512 MB); the bot worker and the page lose the 33.5 MB
  buffer and its copy.
- **Offline**: device games still work; the bot plays its openings without the book (weaker and
  slower in the first moves).
- **Docs**: architecture (bots, server routes), operations (server memory, `/book`), nfr (performance,
  abuse protection), product (bot UX texts).
