# Proposal

## Why

Playing a move takes two taps (choose, then confirm). In a quick game of four in a row that feels
slow: the user wants the berry to drop on the first tap (user's decision 2026-10-01). This reverses
the "one deliberate confirm per move" principle in `product.md`.

## What Changes

- **One tap drops** in every game type (on the device against bots, on the device with friends,
  online): a tap on a column that is not full plays it at once. No choosing step and no ghost
  berry from a tap.
- **"Aseta" removed**: the confirm button under the board goes; the bar keeps "Peru" (against bots
  on the device) and "Vihje".
- **"Vihje" shows, it does not play**: it lights the bot's suggested column with the ghost berry
  where it would land; the player drops by tapping a column (that one or any other).
- Texts follow: the status line, the column label for the hinted column, the hint's title and the
  "place" tip no longer mention a second tap or "Aseta".
- `product.md` (Board, Mobile) records the new rule: one tap per move, no confirm.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-board`: "Column first, one confirm" is replaced by a one-tap drop and a hint that only
  shows the column.
- `visual-theme`: the voice requirement no longer names a confirm button "Aseta".

## Impact

- Workspaces: **client** only (game screen, board, move controls, locales, tests) and **e2e** (the
  move helper taps once). No change in rules, protocol or server: the move command is the same.
- Online games have no undo, so a mistaken tap stays; accepted by the user.
- Docs: `docs/architecture.md` (client board), `docs/development.md` (E2E move helper),
  `openspec/context/product.md`.
