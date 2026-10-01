# Design

## Context

The look lives in one place, `client/src/ui/tokens.css` (light block, two identical dark blocks).
The board is the placeholder's 3×3 grid (`client/src/game/Board.tsx`), pieces are tabler cross and
ring icons, seats elsewhere are flat squares (`SeatMark`), and the end of a game drops square
flakes (`motion/Snowfall`, colour `--snow`). Several tokens carry Palikka's names (`--frost`,
`--snow`). Settings already offer follow device / light / dark (`data-theme` on `<html>`). Bot
names come from the kit (`BOT_NAMES`, server-side in the kit room).

The approved mockup: https://claude.ai/artifact/ExVQ7GqrBkDFW8Mjche2W4 (concept B, Marjat).

## Goals / Non-Goals

**Goals:**
- Final palette, board surface, berry disc, motion and copy, so `game-ui` only lays out the 7 × 6
  grid and the drop animation with what exists.
- Light and dark designed with equal care.

**Non-Goals:**
- The drop animation through a column (needs the grid: `game-ui`, which reuses the squish here as
  its landing).
- Changing the kit (bot names, nickname words, generic screens).
- Sounds (the generated turn alert stays as it is).

## Decisions

### Palette (tokens)

Token values (implementation may nudge a value by a few steps to pass the contrast checks in the
spec; record any nudge here):

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#eef0e8` lichen | `#121610` forest night |
| `--surface` | `#ffffff` | `#1a2016` |
| `--surface-2` | `#e3e7da` | `#232a1e` |
| `--text` | `#24261f` | `#ece8de` |
| `--muted` | `#5f6456` | `#a3a896` |
| `--accent` / `--accent-contrast` | `#34407e` / `#ffffff` | `#8d9bff` / `#10142a` |
| `--border` | `#d6d9cc` | `#2f3628` |
| `--danger` | `#a8323a` | `#ff8a7f` |
| `--board` (birch / dark wood) | `#e2d5b8` | `#2f271d` |
| `--board-grain` | `rgba(110,85,40,.18)` | `rgba(0,0,0,.35)` |
| `--cell` (moss hole) | `#c9d2b4` | `#1a2016` |
| `--cell-shadow` | `inset 0 2px 3px rgba(60,50,20,.25)` | `inset 0 2px 4px rgba(0,0,0,.6)` |
| `--seat-1` puolukka | `#c42b45` | `#ff5d73` |
| `--seat-2` mustikka | `#34407e` | `#8d9bff` |
| `--seat-3` lakka (spare) | `#c7761e` | `#f0a650` |
| `--seat-4` kanerva (spare) | `#8a4f9e` | `#d29be6` |
| `--berry-crown` | `rgba(20,24,50,.75)` | `rgba(20,24,60,.8)` |
| `--shine` (win ring, result sweep) | `#7aa63a` | `#b6e06a` |
| `--leaf` (falling leaves) | `#6f9a3a` | `#9fcf5a` |
| `--out` / `--out-edge` (chip out of play) | `#e1e3da` / `#bfc4b2` | `#262c22` / `#454d3c` |

The accent is the mustikka blue in both themes (buttons, focus). Danger moves off the lingonberry
hue a little (`#a8323a`) so an error does not read as seat 1.

**Renames:** `--snow` → `--leaf` and `--shine` (two roles that were one), `--frost`/`--frost-edge`
→ `--out`/`--out-edge`, `--last-mark` stays, `--preview-ok-outline` stays. New: `--board-grain`,
`--cell-shadow`, `--berry-crown`. Alternative (keep Palikka's names) rejected: the names would lie
about the theme and the next game made from this one would inherit them.

### The berry disc

One `Berry` component (`client/src/game/Berry.tsx`) draws a seat's piece: a circle in
`--seat-N` with a soft highlight (radial gradient upper left) and, for seat 2, a five-point crown
(clip-path) near the top in `--berry-crown`. Props: `seat`, `size` (px or `100%`), `isMe` (ring in
`--text`). Used by `Board` (pieces and the faded preview), `SeatMark` (becomes a thin wrapper
around `Berry`, so the strip and result table follow) and later by `game-ui`'s grid. Pure CSS, no
images. The tabler cross and ring go.

### The board

The placeholder's 3×3 board keeps its structure: birch background with a horizontal grain
(repeating gradient in `--board-grain`), cells become round moss holes (`border-radius: 50%`,
`--cell`, `--cell-shadow`), the berry fills ~88 % of the hole. Tap targets stay ≥ 44 px (the
cell's button is the full square; only its paint is round). The chosen cell keeps its outline
(dashed, `--preview-ok-outline`), the preview berry at 45 % opacity. The winning line: berries get
a 3 px ring in `--shine` instead of the accent cell border.

### Motion

- Settle: `squish` keyframes, scale (1.15, 0.8) → (0.95, 1.05) → 1 over `--motion` (250 ms),
  ease-out, on the last move's berry. Last-move mark: a small dot in `--last-mark` in the berry's
  centre (as in the mockup), so it stays visible under reduced motion.
- Win: the ring appears with one short pulse; leaves fall once. `Snowfall` becomes `LeafFall`:
  same seeded generator, count, duration (2.5 s) and reduced-motion guard, the flake becomes a
  leaf (14 × 8 px, `border-radius: 0 100%`, `--leaf`) with a swaying drift. Shown only on a win
  (today `snow` is set on any game end: check `GameScreen` and limit it to a win).
- The result table's winner sweep uses `--shine`.

Kit TODO (in `tasks.md`): the template's `Snowfall` could take a shape (square / leaf / none) so
each game picks its own without a copy. Not done here.

### Type

Fredoka (variable, `@fontsource-variable/fredoka`, latin + latin-ext subsets for ä ö) for the
title on the start screen, screen headings and the end-of-game line, via a `--font-display` token.
Body and controls stay `--font` (system-ui) for legibility and size. `font-display: swap`.
Alternative (no web font) rejected: the round face is a large part of the approved mockup's
friendliness.

### Copy

Finnish first, English alongside (`client/src/i18n/locales/*.json`):

| Key | fi | en |
|---|---|---|
| `app.tagline` | Neljä marjaa riviin – kavereita tai botteja vastaan | Four berries in a row – against friends or bots |
| `board.cellTaken` | Rivi {{row}}, sarake {{col}}: {{berry}} | Row {{row}}, column {{col}}: {{berry}} |
| `board.cellChosen` | … napauta uudelleen asettaaksesi | … tap again to place |
| new `berry.1` / `berry.2` | puolukka / mustikka | lingonberry / blueberry |
| `progress.marks_*` → `progress.berries_*` | {{count}} marja / marjaa | {{count}} berry / berries |
| `result.mine` | Voitit – kori täynnä! | You won – basket full! |
| `result.other` | {{name}} voitti – kori täynnä | {{name}} won – basket full |
| `result.draw` | Tasapeli – laatikko täynnä | Draw – the crate is full |
| `result.marks` | Marjat | Berries |
| move `confirm` | Aseta | Place |
| move `ready`, help `place` | "Merkitse" → "Aseta" | "Mark" → "Place" |
| help `goal` | Saa kolme marjaa riviin – vaakaan, pystyyn tai vinottain. | Get three berries in a row… |
| leave `confirm` | Merkkisi → Marjasi jäävät laudalle | Your berries stay on the board |

`result.draw` is the table's draw label too; if one key serves both the headline and a table
cell, split it (`result.drawTitle`) so the table cell stays "Tasapeli". The goal text says three
because the placeholder is still tic-tac-toe; `rules-engine` changes it to four.

### Icon and manifest

`client/public/favicon.svg`: a rounded birch square (`#e2d5b8` with two grain lines), a
lingonberry and a blueberry (with crown) side by side, a small leaf. Maskable and apple icon
background `#2f271d`. Manifest `theme_color: "#34407e"`, `background_color: "#eef0e8"`. PNGs and
`.ico` regenerated with `npm run icons -w @neljan-suora/client`.

### Bot names

Kept: the kit's Kettu, Ilves, Pöllö, Näätä are forest animals and fit the berry forest. No kit
change, no spec change.

### How this meets nfr.md

- Logging: nothing new is logged (no server or protocol change).
- Tests: client logic only, per the testing rules: a render test that seat 1 and 2 pieces carry
  their berry labels and that seat 2 has the crown; a test that leaves fall on a win and not on a
  draw; the locales test (fi and en have the same keys) covers the copy. The look is checked in the
  UI check (light and dark, portrait) and with a contrast test (`client/src/ui/tokens.test.ts`) that parses `tokens.css` and checks the spec's pairs.
- Limits: the font adds one woff2 (≈ 30–40 kB per subset), loaded as a separate asset; the JS size
  budget (`npm run size`) is unaffected and must stay green.
- Legal: no yellow seat, no blue board (spec "Own look").

## Risks / Trade-offs

- [Lingonberry red as seat 1 recalls the commercial game's red] → board is wood, the other seat
  blue, never yellow; the berry highlight and crown make the pieces read as berries, not discs.
- [Contrast of mustikka on a dark moss hole] → dark mustikka is lifted to `#8d9bff`; the contrast
  test checks every berry against `--cell` in both themes (≥ 3:1).
- [Placeholder styling may need rework when the 7 × 6 grid lands] → the board surface, hole and
  berry are size-independent (percentages), so `game-ui` reuses them; only the grid template
  changes.
