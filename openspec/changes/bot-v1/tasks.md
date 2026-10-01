# Tasks

## 1. Bitboard position

- [ ] 1.1 `packages/neljan-suora-bots/src/negamax/position.ts`: the position from a rules `Game`
  (two-word `cur`/`mask`, heights, ply), `canPlay`, `play`/`undo` in place, `winningCells` for
  either side, `isWinningMove`, a hash key. Export the cross-word shift from `packages/rules` only if
  cleaner than a copy. Verify: unit tests compare `isWinningMove` and the result of `play` with the
  rules' `playMove`/`hasFour` over 200 seeded random games, and make/undo restores every field.

## 2. Search and evaluation

- [ ] 2.1 `negamax/evaluation.ts`: winning cells weighted by parity and height, open lines, centre
  (design 3). Verify: unit tests that a position with an own odd-row threat (first seat) rates above
  its mirror without it, and the rating is antisymmetric between the two sides.
- [ ] 2.2 `negamax/search.ts`: negamax alpha-beta with win-in-n scores, immediate win / forced
  block / no-gift handling, move order (TT, threats, centre), the typed-array transposition table,
  iterative deepening with a time check every 1024 nodes, root tie-break by rng (design 2). Verify:
  unit tests for each `bot-play` tactic and forced-win scenario (at depth 1 for the tactics, depth 4
  for the double threat), a proven loss picks the longest defence, same seed and depth → same
  column, a time budget with an injected clock stops at the deadline and still answers legally,
  one open column → that column, game over → undefined.
- [ ] 2.3 `negamaxPlayer` as a `Bot<Game, number>` and `devicePlayer = negamaxPlayer`; export from
  `src/index.ts`. Verify: the existing `adapter.test.ts` bot tests include `negamax` and pass;
  `npm run size -w @neljan-suora/client` stays within the worker budget.

## 3. Tournaments and strength requirements

- [ ] 3.1 Registry entry `negamax` (default `{ depth: 8 }`); `playTournamentGame` plays a 2-move
  random opening from the game's seed (design 4). Verify: tournament unit tests — the opening is the
  same for both seat orders of a seed, `parseBot("negamax@100ms")` gives `{ timeMs: 100 }`.
- [ ] 3.2 `strength.json`: the three requirements of the `bot-play` spec (replacing "search beats
  random"). Verify: `npm run strength -w @neljan-suora/bots` passes locally (all three PASS); save
  the report under `tournament-results/`.

## 4. Measurement and tuning

- [ ] 4.1 Measure nodes per second and the reached depth at 800 ms in the opening and the middle
  game for the new bot and for the kit's `bestReplyBot` with full widths (a small script under
  `cli/`, not a test); record the numbers and the kit-vs-own conclusion in `design.md` → Decisions 1.
  Verify: the numbers are in `design.md`.
- [ ] 4.2 Tune the evaluation weights with tournaments (`negamax@d6` variants vs each other and vs
  `brs@d4`); keep the best, note weights and the result in the evaluation's doc comment. Verify:
  `npm run strength` still all PASS after tuning.
- [ ] 4.3 UI check (device game, `playwright-mobile` portrait, light only — no visual change):
  `/?dev=1v1`, leave an open three on an edge, the bot blocks; the bot answers within about a
  second. Verify: the snapshot shows the blocking berry.

## 5. Docs and wrap-up

- [ ] 5.1 Wiki: `docs/architecture.md` → Bots (the game's searcher, `devicePlayer`, measured
  numbers, the kit candidate parts), `docs/development.md` (tournament bot names and the random
  opening), `openspec/context/product.md` → Bot ambition (the decision), roadmap `bot-v1` done.
  Kit TODO noted here: best-reply search with `replyWidth: 3` misses edge threats in two-player
  games (port a fix or a two-player alpha-beta to `../game-kit` later). Verify: the pages read
  right; check chain green
  (`npm run lint && npm run typecheck && npm test && npm run build && npm run size -w @neljan-suora/client`).
