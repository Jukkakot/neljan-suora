# Design

## Context

`GameScreen.tsx` keeps a per-turn `choice` (column + turn); `tap` chooses on the first tap and
sends on the second, `hint` sets the choice to the search bot's column. `MoveControls.tsx` holds
the status line, "Aseta" (enabled when a choice exists), "Peru" and "Vihje". `Board.tsx` draws the
chosen column lit with the ghost berry and marks it `aria-pressed`; its label adds "valittu –
napauta uudelleen pudottaaksesi". `send` already ignores calls while a move is pending and the
board is `busy` then. The E2E helper `playFirstColumn` taps twice and reads the landing cell from
the ghost.

## Goals / Non-Goals

**Goals:**
- One tap on a column plays it, everywhere.
- The hint still helps without playing for the player.

**Non-Goals:**
- A setting to bring the confirm back (user chose "everywhere", no option).
- A hover preview on desktop.
- Undo in online games.
- Rules, protocol or server changes.

## Decisions

1. **`tap` sends at once.** `tap(column)` calls `send(column)`; the `choice` state stays only for
   the hint (renamed `hinted`, same per-turn shape so it is forgotten when the turn changes or the
   column fills). A successful send clears it.
2. **Double-tap guard is the existing one**: `send` returns while `pending`, and the board is
   `busy` (not tappable) while a move is on its way. A unit test covers a second tap before the
   move resolves.
3. **Board props**: `chosen` → `hinted`. The hinted column keeps the lit look and the ghost; it is
   no longer `aria-pressed` (nothing is "selected"). Its label suffix becomes ", vihje" /
   ", hint".
4. **Move controls**: "Aseta" and its `ready`/`onConfirm` props go. The bar holds "Peru" (when
   given) and "Vihje"; "Vihje" stays secondary. Locale key `move.confirm` and `move.ready` are
   removed.
5. **Texts** (fi / en):
   - status on the viewer's turn: "Napauta saraketta" / "Tap a column"; with a hint shown:
     "Vihje: sarake {{column}}" / "Hint: column {{column}}".
   - hint title: "Näytä botin ehdottama sarake" / "Show the bot's suggested column".
   - tip "place": "Napauta saraketta – marja putoaa pohjalle." / "Tap a column – the berry drops to
     the bottom."
6. **E2E helper** `playFirstColumn`: reads the landing cell (lowest empty cell of the first open
   column) before the tap, taps once, waits for that cell to be taken.
7. **Product doc**: `product.md` Board and Mobile lines change to "one tap drops, no confirm; the
   hint shows a column". The `game-board` main spec's Purpose line is updated at archive.

## NFR (openspec/context/nfr.md)

- **Logging:** unchanged; a move is the same `cmd` as before.
- **Tests:** client screen tests rewritten for the new requirements (one tap sends; quick second
  tap sends once; hint shows the ghost and sends nothing; tapping after a hint sends the tapped
  column). E2E smoke covers the critical path through the changed helper.
- **Limits / abuse:** unchanged; the server still validates every move.
- **Performance / size:** the client shrinks slightly (one button less); bundle size check stays.

## Risks / Trade-offs

- A mistaken tap in an online game cannot be taken back → accepted by the user.
- The hint's ghost could be read as "selected" → its status line says "Vihje: sarake N" and the
  label says "vihje", not "valittu".
