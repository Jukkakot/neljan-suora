# Tasks

## 1. Solver and measurement

- [x] 1.1 `packages/neljan-suora-bots/src/perfect/solve.ts`: the win/draw/loss solver on `Position`
  (null-window negamax over {-1, 0, 1}, its own typed-array table with halving allocation, the
  heuristic searcher's pre-search filters, threats-then-centre order, a node limit that answers
  "unknown"); a root function giving the best outcome and the set of columns reaching it (design 1).
  Verify: property test over 300 seeded random positions with ≥ 28 discs, each verdict equals the
  sign of `negamaxBot`'s exact full-depth score; the node limit returns "unknown" on an early
  position; a position and its mirror get the same verdict.
- [ ] 1.2 Extend `cli/bench.ts` with the solver: nodes/s and the nodes needed to settle positions
  sampled at plies 6, 8, 10, 12, 14 and 16 (self-play by `negamax@d4`, 20 each). Set `SOLVE_NODES`
  (design 2: what settles in ~2 s on this desktop ÷ 4) and estimate the book's generation time and
  entry count with a dry run of the generator's first waves (task 3.1 may come first). Verify:
  numbers, `SOLVE_NODES` and the cost-gate outcome recorded in `design.md` → Decisions 2 and 4.

## 2. The perfect bot

- [x] 2.1 `negamaxBot`: optional root `candidates` (only these columns at the root; the pre-search
  filters still apply inside them). Verify: unit test that a candidate set excluding the heuristic's
  favourite makes it pick within the set; the existing search tests still pass.
- [x] 2.2 `src/perfect/book.ts`: parse the `NSB1` format from an `ArrayBuffer` (version check →
  "no book" on mismatch), canonical-key lookup with mirroring of the mask; a writer used by the
  generator and the tests (design 3). Verify: round trip of a hand-made book; a mirrored position
  finds its entry with a mirrored mask; an unknown version parses as no book.
- [x] 2.3 `src/perfect/bot.ts`: `perfectBot({ book? })` — game over / one column as today; book hit →
  outcome and best columns, else root solve within `iterations` and ≤ 70 % of `timeMs`; heuristic
  over the best columns (all columns when lost or unsettled) with the rest of the budget; seed picks
  among equal columns (design 1, 2). `setBook(book)` for the worker. `perfectPlayer`,
  `devicePlayer = perfectPlayer`, exports. Verify: unit tests for the spec scenarios that are cheap —
  Opens in the centre (with a one-entry book), Never throws away a won game and Holds a draw on
  late positions, Solve limit runs out (fake clock and tiny limit → heuristic's column), Same seed,
  same book move, Unsolved position within the time budget (fake clock: answers by the deadline);
  the existing tactic tests run against `devicePlayer` too.

## 3. The opening book

- [x] 3.1 `cli/book.ts` + `npm run book -w @neljan-suora/bots`: roots = every position with ≤ 2 discs,
  waves by disc count, worker threads, the adaptive storing and expansion rules, checkpoints in
  `book/.progress/` (git-ignored), the self-checks, output `book/neljan-suora-book.bin`; a
  `--max-plies` option for dry runs (design 3, 4). Verify: a dry run with `--max-plies 4` finishes,
  passes the self-checks for the start position, and resumes after being killed mid-wave.
- [ ] 3.2 Run the full generation detached in the background (apply the cost gate from 1.2 first);
  continue with group 4 meanwhile. Commit the book when done. Verify: the self-checks pass, the file
  is ≤ 8 MB, its entry count and generation time recorded in `design.md` → Decision 4.
- [x] 3.3 Package export of the book file (`@neljan-suora/bots/book`) for Vite `?url` and a disk
  loader in `cli/` for the tournament. Verify: `npm run build` emits a hashed `.bin` asset under
  `client/dist/assets/`.

## 4. Client wiring

- [x] 4.1 `client/src/bots/`: `BOT_BUDGET = { timeMs: 3000, iterations: SOLVE_NODES }`, divided by
  speed; the page fetches the book on the first ask (move or hint), passes it once in
  `MoveRequest.book`, the worker calls `setBook`; one `client.warn` `kind: "bot.book"` on failure,
  no retry in the visit (design 5). Check the kit keeps the visible pause when the answer comes
  early; keep today's pause if not (design 2). Verify: client unit tests — the fetch happens on
  the first ask and not at import, a failure logs once and later asks still answer, only the first
  request after arrival carries the book; `botBudget(2)` halves time and nodes.
- [x] 4.2 `vite.config.ts`: Workbox runtime route `CacheFirst` for the book's URL, not precached;
  `client/package.json` size-limit entry for the book (≤ 8 MB, no gzip). Verify: `npm run build` and
  `npm run size -w @neljan-suora/client` pass, the main bundle and the worker within their limits,
  the generated service worker has the route and no `.bin` in the precache list.
- [ ] 4.3 UI check (`playwright-mobile`, portrait, light only — nothing visual changes): `/?dev=1v1`
  with the bot first → it opens in column 3 after the usual pause; the network log shows the book
  fetched once, after the start screen; "Vihje" shows a column. Then reload offline (DevTools
  offline via the browser context) and play a move: the bot answers. Verify: accessibility snapshot
  or DOM query per step; no screenshot needed.

## 5. Strength

- [ ] 5.1 Tournament registry `perfect` (`{ depth: 8, iterations: SOLVE_NODES }`, loads the book from
  disk); `strength.json` + `cli/strength.ts`: `perfect` vs `negamax@d8` share ≥ 0.8 over 100 games,
  and the `noLossWhenSettled` check (design 6). Verify: tournament unit tests for `parseBot("perfect")`
  and the check's pass/fail on two scripted games; `npm run strength -w @neljan-suora/bots` passes
  locally; report saved under `tournament-results/`.

## 6. Docs and roadmap

- [x] 6.1 `docs/architecture.md` → Bots (solver, perfect bot, book, loading), `docs/development.md`
  (generating the book: command, time, when to regenerate), `openspec/context/product.md` → Bot
  ambition (perfect play, user's decision to replace), `openspec/context/nfr.md` → Performance
  (book ≤ 8 MB, fetched on demand), roadmap: add `perfect-bot` as done and remove it from "Later".
  Verify: the wiki pages name no functions or UI texts; `npm run lint` passes.
- [ ] 6.2 Check chain (`npm run lint && npm run typecheck && npm test && npm run build && npm run
  size -w @neljan-suora/client`), E2E smoke (`npm run e2e`) since the device bot game path changed,
  commit, push. Verify: all green; the deployed game's bot opens in column 3 (listed as a production
  check in the summary).
