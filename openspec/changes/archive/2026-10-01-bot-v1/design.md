# Design

## Context

- The offered bot (`devicePlayer`) is the kit's `bestReplyBot` on `evaluate` (a cell scan of the 69
  lines) through the `MultiplayerGame` adapter. Each node copies the rules' `Game` (`playMove`
  rebuilds the 42-cell array and runs the win check), so the search is slow, and its reply layer
  keeps only the opponent's `replyWidth = 3` best replies by `moveKey` (centre first). A threat that
  must be met on columns 0, 1, 5 or 6 is never searched: that is the missed block seen in the
  `game-ui` UI check, not a depth problem.
- The rules already keep a seat's discs as two 32-bit-safe words (`packages/rules/src/bitboard.ts`:
  bit `7·column + height`, sentinel row, `lo` = columns 0–3, `hi` = columns 4–6) and `hasFour` on
  them.
- The client asks `chooseMove(game, { timeMs: 800 / speed }, seed)` in a Web Worker (budget 30 kB
  gzip, checked by `npm run size`). The tournament CLI runs bots by name with budgets, and
  `strength.json` holds requirements checked by `.github/workflows/tournament.yml`.

## Goals / Non-Goals

**Goals:**

- A searcher that plays tactically sound at once and searches deep (≥ 10 plies in the opening on a
  desktop in 800 ms, more as the board fills), deterministic for a depth budget and seed.
- Settle "kit search or own" by measurement and record it.

**Non-Goals:**

- Perfect play, an opening book or an endgame database (roadmap "Later").
- Difficulty levels or a level picker (the budget interface allows them later).
- Changing the kit's search (a TODO for the kit only) or anything in the server, protocol or UI.

## Decisions

### 1. The game's own searcher, not the kit's

The kit's best-reply search is built for more than two players; for two players it is plain
alpha-beta with beams that prune the opponent's replies, which is exactly what loses tactics here.
Widening the beams on the adapter's `Game` objects would stay slow (an allocation and a 42-cell
copy per node). A searcher on its own bitboard position does make/unmake with a few integer ops per
node, so it is chosen. Alternative considered: kit `bestReplyBot` with `replyWidth: 7, width: 7` —
kept as a measured baseline, not as the product.

**Measured (task 4.1, `npm run bench`, desktop, 800 ms):** negamax ~2.3–2.6 M nodes/s, depth 14 in
the opening and 16 in a 12-disc middle game; the kit's search with full widths reaches depth 9 and
10. Head-to-head at an equal 100 ms per move over 60 games: negamax 100 %. Conclusion: the game's
own searcher.

### 2. Position and search

- `Position` (internal to `packages/neljan-suora-bots/src/negamax/`): `cur`/`mask` as `lo`/`hi`
  word pairs in the rules' layout (the side to move's discs and all discs), per-column heights, and
  the ply count. Built once from the rules' `Game` (`bitsOf`), then made and unmade in place (no
  allocation in the search loop). Winning-cell detection uses the shift-and trick per direction on
  the two words; the cross-word shift helper is copied or exported from the rules (rules change
  only if exporting is cleaner; then `RULES_VERSION` is unchanged since behaviour is not).
- Negamax with alpha-beta, scores as "win in n plies" (`WIN − ply`), so shorter wins and longer
  losses are preferred (spec "Sees forced wins").
- At every node, before searching: a move that wins at once returns at once; if the opponent has
  an immediate win in two columns the node is lost; if in one, that column is the only move
  searched. Moves that drop under an opponent's winning cell are searched last (or pruned when a
  safe move exists). This gives the spec's tactics at any depth, including depth 1.
- Move order: transposition-table move first, then by the number of own winning cells the move
  creates (threats), then centre-first (3, 2, 4, 1, 5, 0, 6).
- Transposition table: fixed-size typed arrays (2^20 entries, ~12 MB as two `Uint32Array` key words,
  an `Int16Array` score, a `Uint8Array` flag+depth and a `Uint8Array` best move), key = `cur + mask`
  (exact, below 2^49, stored in a `Float64Array`), index = a multiplicative hash of the two words,
  replace-always. Allocated on the first answer of a `Bot` instance (halved while allocation
  fails) and **cleared for every answer** (implementation decision: reusing it between answers
  would make a depth budget non-reproducible; the clear costs a few ms).
- **Forced replies cost no depth** (added during implementation): a node with exactly one
  non-losing move searches it at the same depth. It took `negamax@d8` vs `brs@d4` from 92 % to
  96.5 % over 200 games.
- Iterative deepening from depth 1 up, stopping when the time budget expires (checked every 1024
  nodes), the depth budget is reached, or the result is a proven win/loss; the answer is the last
  completed depth's, or a better move fully searched at the interrupted depth (as the kit does).
- Root ties: root moves whose scores at the last completed depth are exactly equal are ordered by
  the seeded rng (one `rng.int` draw); all other choices are deterministic.

### 3. Evaluation

At the leaves, for the side to move: per column, the lowest winning cell (an empty cell that would
complete four) of either side decides the column: it counts 40 when it lies on its side's parity
(odd rows from the bottom for the side that moved first, even for the other; zugzwang) and 12
otherwise; every winning cell above a column's lowest counts 4. Plus the difference of the discs'
cell weights (the classic "lines through the cell" table, kept incrementally). No open-two term:
not needed by measurement. Tuning (task 4.2, `negamax@d8` vs `brs@d4`, 100 games): a flat count
of winning cells with parity weights gave 85–88 %; the lowest-per-column rule 92–95 %; with the
forced-reply extension 96.5 % over 200 games (nearby weights within noise). The old `evaluate`
stays for the greedy, brs and mcts baselines.

### 4. Tournaments and requirements

- Registry: `negamax` (default budget `{ depth: 8 }`), and labels `negamax@d<n>` / `negamax@<n>ms`
  as for the others.
- Random opening: `playTournamentGame` plays 2 random legal moves (one per seat) drawn from the
  game's seed before the bots take over. The kit's schedule plays each seed in both seat orders,
  so both bots get the same opening from each side. Without it two deterministic bots replay one
  or two games and the share means nothing. Requirements and ad-hoc tournaments both get it; the
  unit tests of `playTournamentGame` are updated.
- `strength.json` (spec "Measured strength"): `negamax` vs `random` 100 games ≥ 0.98;
  `negamax@d8` vs `brs@d4` 100 games ≥ 0.9 (measured 100 % and 99 %). The old "search beats
  random" entry is replaced by the first. The equal-time requirement planned here was dropped
  during implementation: the project's rule (`cli/strength.test.ts`) keeps requirements
  machine-independent, and a CI runner's load would make a time-limited share flaky; the
  equal-time result is recorded in Decision 1 instead. If a threshold is not met after
  tuning, the bot is improved, not the threshold; a threshold is only lowered when measurement
  shows the bot already plays near-perfectly against that baseline's draws (recorded here).
- `devicePlayer = negamaxPlayer`; `BOT_BUDGET` stays `{ timeMs: 800 }`.

### 5. Where it lives

All in `packages/neljan-suora-bots/src/negamax/` (position, search, evaluation, the `Bot`). The
searcher is game-specific (bitboards of this grid); what is reusable for other two-player games
(iterative deepening with a time check, typed-array TT, root tie-breaking) is noted as a kit
candidate in the wiki, not extracted now.

## NFR (openspec/context/nfr.md)

- **Performance:** search only in the worker under the time budget (unchanged path). Worker
  bundle stays ≤ 30 kB gzip (`npm run size`); TT memory ≤ 12 MB. Nodes per second measured once
  (task 4.1) and noted in the wiki.
- **Tests:** unit tests for the position (make/unmake, winning cells, against the rules' `hasFour`
  on random games), for each spec tactic and forced-win scenario, determinism, the time budget
  (with an injected clock), and the registry/opening. Strength is measured only in the tournament
  workflow, never in `npm test`. No E2E change (the bot smoke still plays to the end).
- **Logging:** no new events; the worker already logs failures through the kit. The tournament
  report shows the share per requirement.
- **Limits:** depth capped at 42; the TT size is fixed; a budget without limits is refused as before.

## Risks / Trade-offs

- [12 MB typed arrays in a phone worker] → allocate lazily on the first move; fall back to 2^18
  entries if allocation throws.
- [Time check granularity overshoots the budget on a slow phone] → check every 1024 nodes (≈ 1 ms
  even on a slow device); the spec allows 50 ms.
- [Threshold 0.9 at depth 8 vs depth 4 not met due to draws] → see 4: improve the bot; draws are
  rare in this game between unequal bots.

## Migration Plan

None: the bot swap ships with the next client deploy; saved device games continue (the bot only
reads the position).
