## Context

`Board` (client) draws `ROWS × COLUMNS` holes, each a `<button>` that reports its column; the
preview is the viewer's faded berry in the landing hole; the last move squishes in
(`useLastMove`), the winning line gets a leaf-green ring, `LeafFall` runs on a win seen by the
winner or a spectator. `GameScreen` keeps the chosen column per turn.

## Goals / Non-Goals

**Goals:** column-first controls as product.md describes, a drop that reads as gravity, a winning
row that stands out, labels that work with a screen reader, everything within the Marjat theme in
light and dark.

**Non-Goals:** drag, arrow-key navigation, new sounds, grid variants.

## Decisions

### Column buttons

The crate is a row of seven `<button>`s (`data-column`), each a vertical stack of six holes
(`<span data-cell data-owner>`, `aria-hidden`), so the tap target is the whole column (≈ 44 × 290 px
on a 360 px wide phone). A full column's button is disabled; while not the viewer's turn (or a
command is pending) all are disabled. Tapping the chosen column again sends the move, tapping
another moves the choice. The data attributes stay so tests and the E2E helper can read the board.

### Ghost and column light

The chosen column's button gets a light strip (`--column-light`: a translucent leaf/birch tint per
theme, from tokens) and its landing hole shows the viewer's berry at 0.45 opacity with the existing
dashed `--preview-ok-outline`. Hover (pointer devices) lights a column faintly.

### Drop

`Board` knows the last move's cells (`lastMove`). The piece in such a cell gets the CSS variable
`--fall` = its row index + 1 (the rows from just above the top hole) and the animation
`drop` translates it from `translateY(calc(var(--fall) * -1 * var(--pitch)))` to 0, where `--pitch`
is one hole plus the gap. Duration `calc(90ms + var(--fall) * 35ms)` (≤ 300 ms for six rows) with
`cubic-bezier(0.5, 0, 1, 1)` (ease-in), then the existing `squish` (200 ms) chained with
`animation-delay` = the drop's duration. Total ≤ 500 ms. The falling berry passes over the holes
above; the crate does not clip it (the start is inside the crate's top padding at most one hole
above the top row, so nothing clips at the board edge). Reduced motion: no animation.

Several filled cells at once (a reload, a bot reply arriving with the move) animate each from its
own row; `useLastMove` already gives the set.

### Winning row

When `line` is non-empty, berries not in it get `opacity: 0.4` (class on the board), the line keeps
its ring and pulse. A draw (`line` empty) changes nothing. The end screen's leaves are unchanged;
the UI check confirms they look right over the new board (the note from `theme`, where a player's
win could not be reached).

### Labels (fi / en)

The board is `role="group"` "Pelilauta". A column button reads
"Sarake {{col}}: {{contents}}" where contents is "tyhjä" or the berries bottom up
("puolukka, mustikka, puolukka"), plus ", täynnä" when full or ", valittu – napauta uudelleen
pudottaaksesi" when chosen. English: "Column {{col}}: …", "empty", ", full",
", chosen – tap again to drop". The old per-cell keys are removed.

### Layout

The board keeps `aspect-ratio: 7 / 6` (padding included) and the existing layout; on the reference
phone (360 px) the columns are ≥ 44 px wide. Landscape and narrow desktop use the existing wide
layout (board beside the controls), checked once.

## NFR

- **Logging:** none (UI only).
- **Tests:** a render test for the column labels and disabled full column; the screen tests for
  tap/confirm/hint read column buttons; E2E helper taps a column. Motion and looks: UI check
  (portrait light + dark, a won game watched with `?dev=0v2` for leaves and the faded rest; a
  quick landscape check since the board's structure changes).
- **Limits:** client bundle size stays within `size-limit`.

## Risks / Trade-offs

- A whole-column button hides the per-hole structure from assistive tech → the label lists the
  column's berries.
