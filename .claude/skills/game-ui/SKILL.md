---
name: game-ui
description: Game-specific UI and theme rules (playful voice, player colours, bot names, board legibility). Load together with the global `ui` skill before any UI change, copy change or theme decision in this game.
---

# Game UI

Builds on the global `ui` skill; this adds what only games need.

## Theme and voice

- The theme is agreed early with visual mockups (propose options, show light and dark) and recorded
  in `openspec/context/product.md` → Theme.
- Unless the project says otherwise, texts and names have a playful voice in the theme: player
  colours, bot names, notices, the end screen.

## Legibility

- Current player, current phase and the available actions are unambiguous at all times.
- Tokens and pieces are never clipped at board or cell edges (unless the clipping container also
  clips its own content).

## Bots

Bot "brains" run in the browser (Web Worker, `@game-kit/bots`): in online games the host's browser
computes bot moves and the server only validates them. Bot strength then varies with the host's
device; that is accepted. No paid backend.
