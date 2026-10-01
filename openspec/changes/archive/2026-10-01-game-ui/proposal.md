## Why

`rules-engine` left the template's cell grid with a minimal column wiring: every hole is its own
button, the preview is only a faded berry, and a new berry just appears. The game needs the upright
grid as its real board: whole columns to tap, a clear ghost of where the berry will land, the berry
dropping down its column, and a winning row that stands out.

## What Changes

- **client:** the board becomes seven column buttons over the birch crate (each the full height of
  the grid, ≥ 44 px wide); a tap shows the ghost berry in the landing hole and lights the column, a
  second tap or "Aseta" drops it, another column moves the ghost. A full column is disabled.
- **client:** the new berry drops from the top of its column to its hole (time grows with the fall,
  ease-in like gravity) and then squishes; reduced motion shows it at rest at once.
- **client:** once a game is won, the berries outside the winning line fade so the line stands out
  (with the existing leaf-green ring); a draw fades nothing.
- **client:** accessible labels name the column, what it holds and whether it is full or chosen.
- **e2e:** the smoke helper taps a column button.
- **tools:** the games front page card is refreshed with the new board.

Workspaces touched: client, e2e (and the front page repo through `homepage-card`).

## Capabilities

### New Capabilities

- `game-board`: the grid's controls (column choice, ghost, one confirm, full columns), its
  accessible labels and the winning-line view.

### Modified Capabilities

- `visual-theme`: "Motion of a placed piece" becomes a drop down the column followed by the squish.

## Impact

- No protocol, server or rules change.
- Non-goals: drag to drop, keyboard arrow navigation between columns (Tab reaches each column),
  sound changes, larger grids.
