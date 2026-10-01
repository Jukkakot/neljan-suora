## Context

The rules package holds the placeholder Ristinolla as a plain JSON game (`Game`) with pure functions
(`startGame`, `playMove`, `removeSeat`, `endGame`, `randomMove`) behind the kit's contract
(`contract.ts`). Server, client (device games, saves, view model, hint) and the bot adapter all use
that game and its move `{ cell }`. This change swaps the rules and carries the new move through
every workspace with as little reshaping as possible; the look of the grid is `game-ui`.

## Goals / Non-Goals

**Goals:** the real rules, pure and seeded, with property tests; a bitboard win check that
`bot-v1` can build its search on; every workspace playing the new move end to end (checks and E2E
green).

**Non-Goals:** the grid's look, ghost disc, drop animation and layout (`game-ui`); a searching bot
(`bot-v1`); alternating the starter on a rematch (needs the kit, below); variants (larger grids,
pop out).

## Decisions

### The game stays plain JSON

`Game` keeps its fields (`seed`, `seats`, `left`, `cells`, `turn`, `moves`, `over`, `winners`,
`line`) so saves, the worker boundary and the synced state stay plain data. `cells` holds 42
entries, **row-major with the top row first** (row 0 is the top, row 5 the bottom), because that is
how the board is drawn and synced. `line` holds every cell of every four-or-longer row the winning
disc completed, ascending (a disc that completes two rows at once shows both).

Constants: `COLUMNS = 7`, `ROWS = 6`, `CELLS = 42`. A move is `{ column }` (0–6, left to right).

### Bitboards beside the JSON game

`bitboard.ts` holds the standard 7 × (6 + 1) layout: bit `7·column + height` per disc, height
counted from the bottom, with an always-empty sentinel bit on top of each column so shifts do not
wrap. 49 bits do not fit JavaScript's 32-bit bitwise operators, and `BigInt` is too slow for search,
so a board is two unsigned 32-bit words: `lo` holds columns 0–3 (28 bits), `hi` columns 4–6
(21 bits); a right shift by n ≤ 28 is `lo' = (lo >>> n | hi << (28 − n)) & 0x0FFFFFFF`,
`hi' = hi >>> n`. Four in a row: for each direction d in 1 (up), 7 (across), 6 and 8 (diagonals),
`m = b & (b >> d)` and a four exists when `m & (m >> 2d)` is not zero.

The rules use it for the win check in `playMove`; the winning cells are then found by scanning the
69 precomputed lines of four through the new disc (cheap, only once per game). A property test
checks the bitboard against a plain scan of all lines on random reachable positions. `bot-v1`
builds its position and search on these words (and may move `bitboard.ts` into the bots package if
the rules no longer need it).

### Refusals

`playMove` order: `NOT_SEATED`, `WRONG_PHASE`, `NOT_YOUR_TURN`, then `INVALID_COMMAND` for a column
that is not an integer 0–6, and the game's own `COLUMN_FULL` for a full column (replacing
`CELL_TAKEN` in the protocol's `MOVE_ERROR_CODES` and the client's notice key). A refusal changes
nothing. The move's log text is `col<column>` (0-based, as on the wire).

### Who starts

The seed draws the first seat, as in the placeholder. A rematch in the kit creates a new room with a
new seed and `start(seed, seats, options)` gets nothing about the previous game, so "the other seat
starts the rematch" (product.md) cannot be done in the game alone. Decision: keep the seeded draw
now; a kit TODO is noted in `tasks.md` (pass the previous game's starter, or a rematch counter, to
`start`). This does not force rework: only `startGame` would change.

### Fallback move

The server's fallback move (a timed-out turn with autoplay) is a legal column drawn from the seed
and the move count, like the placeholder's free cell.

### Server sync

`NeljanSuoraState` keeps `cells` (now 42) and `line`; `reset` and `sync` are unchanged apart from
the length. `BOARD_CELLS` in the protocol becomes 42 and a new `BOARD_COLUMNS = 7` bounds the move
schema; the server test keeps them equal to the rules' constants.

### Client wiring (minimal)

- `Board` gets the column count and an `onColumn` callback; the grid is `ROWS × COLUMNS`. Every
  cell of a column that is not full is a button that chooses that column; the viewer's berry is
  previewed in the landing cell (`aria-pressed` there); a second tap in the chosen column, or
  "Aseta", drops it. A full column's cells are disabled. Accessible labels keep row/column.
- `GameScreen` keeps the choice as `{ turn, column }`; the hint asks the bot at depth 4.
- `checkGame` checks 42 cells and `moves ≤ 42`; old saves fail and are dropped.
- The view model, test views and the session's `move` payload follow `{ column }`.
- Copy: the notice for `COLUMN_FULL` ("Sarake on täynnä" / "That column is full"); the move
  prompts speak of a column ("Valitse sarake" / "Choose a column"). Restrained voice
  (visual-theme): no theme words.

### Bots

The adapter's moves are the legal columns, its move key orders centre first (3, then 2/4, 1/5,
0/6). The evaluation scores the 69 lines of four like the placeholder scored its lines (own-only
lines count squared, the other's against). `brs` in the tournament and the strength requirement
drops to depth 4 (depth 9 is far too slow on a 7-wide tree); "search beats random" stays the
requirement until `bot-v1`.

## NFR

- **Logging:** no new events; the move text in refusal facts is `col<n>`; `stateFacts` keeps
  counting the discs (`marks`).
- **Tests:** rules unit tests named after every `game-rules` scenario; fast-check properties
  (bitboard = scan, a game of random legal moves always ends within 42 moves with a consistent
  board: gravity holds, counts differ by at most one, `line` cells all belong to the winner);
  protocol schema tests; the server room test plays a vertical win and a full-column refusal;
  client view-model/save tests and the two screen tests follow; E2E smoke plays to the end.
- **Limits:** the move schema bounds the column; nothing else changes.

## Risks / Trade-offs

- The split-word bitboard is easy to get subtly wrong → the property test against the plain scan.
- Depth-4 search is weak → it is only the stand-in until `bot-v1`.
