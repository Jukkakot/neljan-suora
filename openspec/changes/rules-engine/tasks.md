# Tasks

## 1. Rules

- [ ] 1.1 Add `packages/rules/src/bitboard.ts` (split-word 7 × 7 layout, `bitsOf(cells, seat)`, `hasFour`) and `LINES` (the 69 lines of four) per design. Verify: a fast-check property that `hasFour` equals a plain scan of `LINES` on random reachable positions.
- [ ] 1.2 Replace Ristinolla in `game.ts`: `COLUMNS`, `ROWS`, `CELLS`, `Move = { column }`, `legalColumns`, `landingCell`, `playMove` with `COLUMN_FULL`/`INVALID_COMMAND`, the winning line, draw, fallback column; `contract.ts` move text `col<n>`; `testing.ts` `gameAfter(columns)`. Verify: unit tests named after every `game-rules` scenario, plus properties (random legal games end within 42 moves, gravity holds, disc counts differ by ≤ 1, `line` cells belong to the winner).

## 2. Protocol and server

- [ ] 2.1 Protocol: `BOARD_CELLS = 42`, `BOARD_COLUMNS = 7`, `MovePayload { column }`, `moveSchema`, `MOVE_ERROR_CODES = ["COLUMN_FULL"]`. Verify: schema tests (every column accepted, off-grid/non-integer/extra refused).
- [ ] 2.2 Server: the schema comment and reset length; room test plays a vertical win (synced cells and line) and refuses a full column with `COLUMN_FULL`; constants equal to the rules'. Verify: `npm test -w @neljan-suora/server`.

## 3. Bots

- [ ] 3.1 Adapter over legal columns with centre-first keys; evaluation over `LINES`; `brs` at depth 4 in the tournament; adapter tests on the new game. Verify: `npm test -w @neljan-suora/bots` and `npm run strength -w @neljan-suora/bots` passes.

## 4. Client and E2E

- [ ] 4.1 `checkGame`, `moveOf` (`column`), view model, test views, session `move`, hint (depth 4), `Board` (`ROWS × COLUMNS`, `onColumn`, preview in the landing cell), `GameScreen` choice by column; locales for `COLUMN_FULL` and the column prompts. Verify: client tests updated (view model, save check, the two tap/confirm screen tests, hint picks the winning column).
- [ ] 4.2 E2E helpers and smoke: 42 cells, play the first playable column by tapping twice. Verify: `npm run e2e` (smoke) green.

## 5. Check and docs

- [ ] 5.1 Run the check chain once and fix failures.
- [ ] 5.2 Short UI check (`/?dev=1v1`, portrait, light): the 7 × 6 grid plays a column with two taps.
- [ ] 5.3 Docs: `docs/architecture.md` (placeholder notes → the real rules, move `{ column }`, bitboard), `docs/README.md`, `product.md` (who starts: seeded, rematch alternation a kit TODO), `openspec/config.yaml` context (drop "placeholder"), `.claude/CLAUDE.md` placeholder line; roadmap `rules-engine` done.

## Notes

- Kit TODO: the kit's `start(seed, seats, options)` gets nothing about the previous game, so a
  rematch cannot let the other seat start; pass the previous starter (or a rematch counter).
