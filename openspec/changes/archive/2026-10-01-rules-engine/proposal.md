## Why

The game still runs the template's placeholder, Ristinolla. Neljän suora's own rules (7 × 6 upright
grid, gravity, four in a row) must replace it before the real board UI (`game-ui`) and the real bot
(`bot-v1`) can be built.

## What Changes

- **rules:** the gravity four-in-a-row rules replace Ristinolla in `packages/rules`: a 7 × 6 grid,
  a move is a column, the berry drops to the lowest free cell, four in a row (across, up, either
  diagonal) wins and the winning cells are kept, a full grid is a draw. A bitboard position for fast
  win checks (and for `bot-v1`'s search) sits beside the plain JSON game. Property tests check it
  against a plain scan.
- **protocol:** **BREAKING** the move payload becomes `{ column }` (0–6); the game's own refusal
  `CELL_TAKEN` becomes `COLUMN_FULL`; the grid size constants follow.
- **server:** the synced board grows to 42 cells (row-major, top row first); the wiring follows the
  new move.
- **client:** minimal wiring so the game is playable end to end: the board draws 7 × 6, a tap in a
  column chooses that column (the berry is previewed where it would land), a second tap or "Aseta"
  drops it; the hint, the saved-game check and the view model follow the new game. The real grid UI
  (ghost disc, drop animation, layout) is `game-ui`.
- **bots:** the adapter's moves become the legal columns and the evaluation scores the 69 lines of
  four, so the kit's bots keep playing; the strength requirement stays "search beats random".
- **e2e:** the smoke tests play columns on the 42-cell board.

Workspaces touched: rules, protocol, server, client, bots, e2e.

## Capabilities

### New Capabilities

- `game-rules`: Neljän suora's rules: the grid, who starts, a move, refusals, win with the winning
  row, draw.

### Modified Capabilities

- `game-room`: the placeholder parts (seat count note, the rules' refusal `CELL_TAKEN`, three in a
  row) are replaced by the real rules' (`COLUMN_FULL`, four in a row).

## Impact

- The move payload and a game error code change: an old cached client cannot play against the new
  server (nothing is deployed yet, so nobody is affected).
- Saved device games of the placeholder fail the saved-game check and are dropped (the kit then
  shows the start screen).
- Non-goals: the grid's look and motion (`game-ui`), a searching bot (`bot-v1`), alternating the
  starter on a rematch (the kit's rematch makes a new room with a new seed; see design).
