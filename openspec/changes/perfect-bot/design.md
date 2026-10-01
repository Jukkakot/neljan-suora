# Design

## Context

See proposal.md for why. Today `devicePlayer` is `bot-v1`'s negamax (`packages/neljan-suora-bots/src/negamax/`):
heuristic iterative deepening on two-word bitboards, ~2.3 M nodes/s on a desktop, a 2^20-entry
typed-array table cleared per answer, ties broken by the seed. The client asks it in a module Web
Worker (`client/src/bots/`) with `{ timeMs: 800 / speed }`; the same path serves device games, the
online bot runner (host's browser; the room plays its fallback after 10 s of silence) and "Vihje".
The worker bundle has a 30 kB gzip limit, the main bundle 200 kB; the PWA precaches
`**/*.{js,css,html,svg,png,ico,webmanifest}`.

Game theory the design leans on: the first player wins only by opening in column 3; columns 2 and 4
draw; columns 0, 1, 5, 6 lose. So the bot as the second seat starts in a lost position against
perfect play, and its value is in spotting the person's errors.

## Goals / Non-Goals

**Goals:** perfect outcome whenever the position can be settled in budget on a mid-range phone; a book
that makes the early game settled; no regression in the tactics or the forced-win preferences;
machine-independent strength checks.

**Non-Goals:** exact scores (distance to win) from the solver; a minimal book in bytes; levels; the
hint that tells the outcome; any server change.

## Decisions

### 1. Win/draw/loss solver, heuristic chooses within the best outcome

`src/perfect/solve.ts`: a weak solver (outcome only) on the existing `Position` bitboards: null-window
negamax over scores {-1, 0, 1}, its own transposition table (2^21 entries, keys `Float64Array` + a
`Uint8Array` of bound and value, ~19 MB, halving while allocation fails, as in `allocate`), the same
pre-search filters as the heuristic searcher (immediate win, forced block, no disc under the other's
winning cell, double threat = loss), move order by threats made then centre, and a **node limit**
(aborts with "unknown"). The table is **cleared per answer**, like the heuristic table, so a limit
and seed always give the same verdict (reproducibility over speed; keeping it between moves was
considered and rejected for that reason).

Root: each legal column is solved (with the window narrowed to "better than the best so far"), giving
the best outcome and the set of columns that reach it. The heuristic search (`negamaxBot`) then runs
with the remaining budget, **restricted to that set** (a new optional `candidates` argument at its
root). This keeps shortest wins / longest losses, the tactics and seed tie-breaks without exact
scores. Alternative considered: an exact-score solver (Pons-style) — several times slower to settle,
and the heuristic already orders wins by length within its horizon.

When the best outcome is a loss (every column loses), the heuristic chooses among all columns as
today (latest loss, most tricky). When the solve does not finish, the bot answers the heuristic move
over all roots (spec: falls back).

### 2. Budget: time first for the solve, then the heuristic

`Budget` stays the kit's plain JSON. For the perfect bot: `iterations` = the solve's node limit,
`depth` = the heuristic's depth, `timeMs` = the whole answer. With a time budget the solve may use up
to 70 % of it, the heuristic the rest (at least 200 ms of the original budget's share). A book hit
skips the solve.

Client: `BOT_BUDGET = { timeMs: 3000, iterations: SOLVE_NODES }`, divided by the watching speed (time
and nodes both). `SOLVE_NODES` is fixed after measurement (task 1): what the solver searches in
~2 s on a desktop divided by 4 (the nfr reference: a mid-range phone a few years old), so it settles
in about 2 s on such a phone. The visible pause: the kit already shows the bot's move after its
pause even when the answer comes earlier; verify in task 4, and if the kit waits only for the answer,
keep today's pause. "<bot> miettii…" is already the turn line while a bot is on turn.

Online: 3 s is well inside the room's 10 s runner silence; no server change.

### 3. The opening book: adaptive depth, best columns, both seats

The book holds exactly the positions the browser cannot settle within `SOLVE_NODES`, from the roots
until play reaches positions it can. Leaves are not stored (the solver settles them at play time).
Roots: **every position with at most 2 discs** (covers both seats' openings, the tournament's
2-ply random openings and a seat handed to the bot early). Expansion from a stored position:

- side to move is "the bot": store the outcome and the mask of best-outcome columns; expand along
  each best column; if the outcome is a loss, store it and **do not expand** (the heuristic plays a
  lost position anyway; the entry saves the 3 s solve);
- the other side's replies: every legal column is expanded.

Every position is both "the bot to move" and "the other side's reply" in some tree; the generator
walks positions, not trees: a position is stored when it is reachable as a bot-to-move position in a
tree and is not settled within `SOLVE_NODES`.

Entry: the canonical key (the position's key or its mirror's, whichever is smaller; masks mirrored
on lookup), outcome (2 bits), best-column mask (7 bits). File: magic `NSB1`, format version, solver
node limit used, entry count, then keys as two `Uint32Array`s (high, low) sorted, then a
`Uint16Array` of data; lookup is a binary search. ~10 bytes per entry. Budget: **at most 8 MB raw**
(size-limit entry without gzip; GitHub Pages may not compress `.bin`).

Alternatives: a fixed 12-ply full book (Pons-style, ~4 M positions): far beyond what a JS generator
can solve in reasonable time and needs exact scores; the adaptive book stores only what the phone
cannot do itself, which is what the user's "~12 plies, several MB" was for.

### 4. Generating the book

`cli/book.ts` (`npm run book -w @neljan-suora/bots`): Node worker threads (cores − 1), each with a
large table (2^25 entries), positions processed top-down in breadth-first waves (shallow positions
first, sharing their tables' work with their children through the wave order), checkpointed to
`packages/neljan-suora-bots/book/.progress/` after every wave (resumable; ignored by git). The
output `packages/neljan-suora-bots/book/neljan-suora-book.bin` is committed. Self-checks before
writing: the start position is a win with mask {3}; first discs in 2 and 4 are draws, in 0, 1, 5, 6
losses for the first player.

**Cost gate (task 1 measures):** if the estimated generation time exceeds 24 h on this machine,
expand only the most central best column at bot-to-move positions and store a mask of that one
column (the bot then plays it inside the book; the seed has no effect there). If that still exceeds
24 h, the roots shrink to the start position plus all 1-disc positions and the tournament's perfect
requirements use their own opening of 1 ply. Record the outcome here.

The generator runs detached in the background during apply (it may take hours); work continues on
the client tasks meanwhile.

### 5. Shipping the book to the browser

The book is a Vite asset (`import bookUrl from "@neljan-suora/bots/book?url"` via a package export)
— hashed file name, so a new book busts caches. The **page** fetches it (in `botWorkerClient`) the
first time a bot move or hint is asked, logs one `client.warn` (`kind: "bot.book"`) on failure, and
passes the `ArrayBuffer` along with the next request to the worker (`MoveRequest.book?`); the worker
keeps it in module state. Requests made before it arrives run without it. Fetching in the page keeps
logging where it already is and avoids I/O in `src/`. Workbox: a runtime route for the book's URL,
`CacheFirst` (the hash makes it immutable), not precached, so the first load stays small.

Tests and the tournament CLI read the file from disk (`cli/` only); `src/perfect/book.ts` only
parses an `ArrayBuffer`.

### 6. Registry, tournament and strength

`perfectPlayer` = the perfect bot with the book; `devicePlayer = perfectPlayer`. Tournament registry:
`perfect` with `{ depth: 8, iterations: SOLVE_NODES }` (machine independent). New `strength.json`
entries: `perfect` vs `negamax@d8` share ≥ 0.8, 100 games; and a `noLossWhenSettled` check for
`perfect` (the strength CLI records the bot's verdict at its first move and fails a lost game that
started settled as a win or draw). The kit's tournament core is not changed: the extra check lives in
the game's `cli/strength.ts`.

### NFR

- **Logging:** one `client.warn` per visit when the book cannot be fetched; nothing per move.
- **Tests:** solver verdicts vs exact full-depth negamax on random positions with ≥ 28 discs (property
  test); book format round trip, mirror lookup, lookup of a hand-made book; the perfect bot's budget
  split and fallback with a fake clock; client: book fetched on first ask only, failure logged once,
  request carries the book once. Strength and the book's self-checks are not in the unit run.
- **Limits:** worker bundle stays ≤ 30 kB gzip (solver code only); book ≤ 8 MB raw (size-limit);
  memory: two tables in the worker (~12 MB + ~19 MB, both halving on failure).

## Risks / Trade-offs

- [Positions just past the book do not settle in 2 s on a weak phone] → heuristic fallback, as today;
  `SOLVE_NODES` sized for the nfr reference phone.
- [Generation takes very long] → cost gate in Decision 4; resumable checkpoints.
- [Book larger than 8 MB] → the cost gate's narrower expansion also shrinks it; if still over, drop
  the 2-disc roots as in the gate's second step (record it).
- [Bot-vs-bot watching becomes repetitive (both perfect)] → seed picks among best columns; accepted.
- [The bot as first seat always wins] → user's choice (no levels); "Peru" and hints remain.

## Migration Plan

Ship in one deploy: client and book together (the hashed URL ties them). Rollback = revert the
commit; old clients keep working (the book is only fetched by the new worker code).
