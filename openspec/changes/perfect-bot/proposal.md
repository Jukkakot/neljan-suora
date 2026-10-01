# Proposal

## Why

The game is solved, and the bot people play against (`bot-v1`'s negamax) is strong but not perfect:
it searches a heuristic horizon and can misjudge a won or drawn position. The user wants the offered
bot to play perfectly (roadmap "Later": a perfect-play bot with an opening book), and decided on
2026-10-01: it **replaces** the current bot (no difficulty levels), its opening book may be **large
and fetched separately on demand**, and it may think **up to about 3 s** when a position is not yet
solved, falling back to the heuristic search's move when it runs out.

## What Changes

- A **solver** in `@neljan-suora/bots`: a win/draw/loss solve of a position on the game's bitboards
  (null-window search, its own transposition table, threat-first move order), with a node limit.
- The **perfect bot**: a move keeps the position's best outcome (win > draw > loss) under perfect
  play; among the moves of that outcome the existing heuristic search chooses (shortest wins,
  longest losses, tricky moves). If the solve does not finish in its budget, the bot answers with
  the heuristic move, as today.
- An **opening book**: the positions the browser cannot solve within its budget, from the start
  until play reaches positions it can, each with its outcome and best columns. Generated once by a
  resumable Node tool (worker threads), committed as a binary file, served next to the client as
  its own hashed asset, **fetched by the bot worker when the first bot move is asked**, cached for
  offline play after that. It is not in the main bundle or the worker bundle.
- The offered bot (on the device, the online bot runner and "Vihje") becomes the perfect bot, with
  a budget of about 3 s per move at normal speed (divided by the watching speed). The visible pause
  stays; only an unsolved position lengthens it, and "<bot> miettii…" already shows.
- Strength requirements: the perfect bot against the current negamax and against random play; the
  solver checked against exact full-depth search on late positions and the known opening values.
- **BREAKING** (for players): the bot as the first player never loses; as the second it wins or
  draws whenever the person errs into such a position.

Non-goals: difficulty levels; a hint that tells won/drawn/lost (a later roadmap item that can reuse
the solver); larger grids or pop-out; any change to the server's fallback move.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `bot-play`: the bot keeps the best perfect-play outcome when it can solve the position in its
  budget (with the opening book), falls back to the heuristic move otherwise, has new strength
  requirements and a new thinking budget (about 3 s); the book is fetched on demand and the bot
  works without it.

## Impact

- **Workspaces**: `packages/neljan-suora-bots` (solver, book reader, perfect bot, generator CLI,
  tournament registry, `strength.json`) and `client` (worker fetches the book, budget, PWA runtime
  cache for the book, size-limit entry). `packages/rules` and `server` do not change.
- **Assets**: a new committed binary book (a few MB at most; budget in design), served by GitHub
  Pages; generated locally by a long-running tool (hours), not in CI.
- **Performance**: the bot worker allocates a second typed-array table for the solver; bot moves in
  unsolved positions take up to ~3 s instead of 0.8 s.
- **Docs**: architecture (Bots), development (generating the book), product.md (Bot ambition),
  nfr.md (book size budget), roadmap.
