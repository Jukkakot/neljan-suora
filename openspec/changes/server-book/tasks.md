# Tasks

## 1. Bots package

- [ ] 1.1 `src/perfect/book.ts`: `positionFromCells(cells: string)` (42 digits, side to move = `1`) with
  the validation of design 1 (length, digits, gravity, counts, no four in a row) returning the
  `Position` or an error code, and `cellsOf(game)` for the client (same encoding). Verify: unit
  tests — round trip `cellsOf` → `positionFromCells` gives the same key as `Position.fromGame` for
  random games with either starting seat; each invalid case is refused.
- [ ] 1.2 `src/perfect/bot.ts`: `setVerdict(verdict | undefined)` used by the next `choose` instead of
  the book (the `book` option stays for the tournament); the `report` callback unchanged. `answer`
  side: a helper returning `{ move, how: { source, outcome? } }` (outcome for the side that moved).
  Verify: unit tests — a given verdict `{1,[3]}` on the empty board plays 3 with no solve (fake
  report shows `book`); verdict cleared after use; `how` for a solved late position and for an
  unsettled one (no outcome).

## 2. Server

- [ ] 2.1 `server`: depend on `@neljan-suora/bots`; `render.yaml` builds the bots workspace too; load
  the book at start (missing → one `server.warn` `kind: "book"`), mount `GET /book` with the rate
  limit and cache header (design 1). Verify: route tests with supertest-style requests on the Express
  app (or the handler) — empty board → `{known:true,outcome:1,columns:[3]}`; a 20-disc position →
  `{known:false}`; bad inputs → 400 `BAD_POSITION`; missing file → `{known:false}`.

## 3. Client

- [ ] 3.1 `client/src/bots/`: replace `withOpeningBook` with the lookup wrapper (design 2: ≤ 13 discs,
  800 ms timeout, one warning per visit) and the explanation store (design 3); `answer` in the
  worker takes `verdict`; `MoveRequest.book` goes. Remove the book import, the Workbox route, the
  `assetsInlineLimit` rule and the size-limit entry; the bots package export `./book` stays for the
  tournament only (not imported by the client). Verify: client unit tests — verdict passed to the
  worker request; failure/timeout → no verdict and one warning; 14+ discs → no request; the store
  returns the explanation only for its move count; `npm run build` emits no `.book` asset.
- [ ] 3.2 Status line and hint (design 4): texts in `fi.json` and `en.json`, the status selection in
  `GameScreen` (notice > hint > explanation > default), the hint shows how. Verify: a view-level test
  for the status text choice (explanation after a bot move, none after the person's move, winner
  names); UI check (`playwright-mobile`, portrait, light and dark not needed — text only): `?dev=1v1`
  shows "Kettu: kirjasta · Kettu voittaa" after the bot's opening, "Vihje" shows how; `?dev=0v2`
  explains each move; network log has no `.book`.

## 4. Docs and finish

- [ ] 4.1 Wiki: `docs/architecture.md` (bots: book on the server; server routes), `docs/operations.md`
  (server memory, `/book`, production check), `docs/development.md` (book section: the server loads it),
  `openspec/context/nfr.md` (performance: no book download; abuse: `/book` rate limit),
  `openspec/context/product.md` (bot explanation), roadmap: add `server-book` as done. Verify: no
  function names or UI texts in the wiki; `npm run lint` passes.
- [ ] 4.2 Check chain, `npm run e2e`, commit, push. Verify: all green; production checks listed in
  the summary (`/book?cells=000…` answers on Render; the bot opens in column 3 with "kirjasta").
