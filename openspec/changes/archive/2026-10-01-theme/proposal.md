# Proposal

## Why

The game still wears the neutral stand-in "Placeholder" (paper, indigo, square seat marks). Every
project needs its own theme before the real board is built, so `game-ui` can draw the gravity grid
straight in the final look. The user chose **Marjat** from three mockups (light and dark): berries
in a birch crate.

## What Changes

- New theme **Marjat** in light and dark: a lichen-pale or forest-night page, a birch-crate board
  with moss-green holes, seat 1 **puolukka** (lingonberry red) and seat 2 **mustikka** (blueberry
  blue, with a small crown so it reads without colour). Spare seat colours 3–4 stay for the kit
  (lakka, kanerva).
- The piece is a **berry disc**, one shared look used on the board, the chosen cell's preview,
  the player strip and the result table (replaces the square seat mark and the placeholder's
  cross and ring).
- Applied to the placeholder Ristinolla now: round moss holes on the birch board, berries as
  marks, so `game-ui` reuses the board styling and the disc as they are.
- Motion: a placed berry settles with a short squish (≤ 250 ms); the winning line's berries
  shine; at the end leaves fall once over the screen (replaces the snowfall of square flakes);
  `prefers-reduced-motion` stops all of it.
- Voice: restrained. Plain, clear texts in play; the piece is called a berry ("marja"); theme
  words appear only in names and the end-of-game lines ("Voitit – kori täynnä!"). Bot names stay
  the kit's forest animals (Kettu, Ilves, Pöllö, Näätä): they already fit.
- A display face (Fredoka, self-hosted) for the title and headings; body text stays system-ui.
- New app icon and favicon (two berries on birch), manifest colours, and a refreshed games front
  page card.
- `product.md`, `nfr.md`, the project `CLAUDE.md` and the wiki name the theme "Marjat".

## Capabilities

### New Capabilities

- `visual-theme`: the game's look and voice as the player sees it: the two seats as berries,
  light and dark themes, the motion of a placed piece and of a won game, and the end-of-game copy.

### Modified Capabilities

(none: bot names, start screen and device games are unchanged)

## Impact

- Workspaces: **client** only (tokens, board, seat mark, motion, locales, icons, manifest, fonts).
  Rules, server and protocol are untouched.
- New dependency: a self-hosted Fredoka font package in the client.
- Tooling: `npm run icons -w @neljan-suora/client` regenerates the PNG icons; `npm run
  homepage-card -- --push` refreshes the front page card (standing permission).
- Docs: `product.md` → Theme, `nfr.md` → Theme, `.claude/CLAUDE.md`, `docs/architecture.md`,
  `docs/development.md`, `docs/README.md`.
