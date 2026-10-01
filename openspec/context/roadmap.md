# Roadmap

Planned changes in order. Each is an OpenSpec change (`/opsx:propose <name>`), specified ahead in
the spec phase and then implemented. Status: **done**, **specced** (proposal, design, specs and
tasks written), **planned**.

| # | Change | Status | What |
|---|---|---|---|
| 0 | `create` | done | Made from the game-kit template (v0.1.0): workspaces, kit packages, the placeholder game Ristinolla, screens, docs, OpenSpec, `.claude`, CI/deploy, E2E, tournament; GitHub repo `Jukkakot/neljan-suora` |
| 1 | `theme` | done | Agree the theme with light and dark mockups: visual concept, palette and the two disc colours, the drop and win motion, the voice of texts and bot names; tokens, icons and copy follow, product.md and nfr.md record it; front page card refreshed |
| 2 | `rules-engine` | done | Replace Ristinolla with the 7 × 6 gravity rules on bitboards in `packages/rules` (pure, seeded start, contract in `contract.ts`): legal columns, win with the winning row, draw; the protocol's move (a column); property tests |
| 3 | `game-ui` | done | The upright grid in the client shell: column-first controls with a ghost disc and one confirm, drop animation, the winning row shown; view model and client definition; E2E smoke on the real moves; front page card refreshed |
| 4 | `bot-v1` | done | Searching bot (product.md → Bot ambition) through the bot adapter, measured against the kit's search; a strength requirement in `strength.json`, tournament green |
| 5 | `first-deploy` | planned | The rest of the setup checklist (docs/operations.md): Pages, Render, Axiom, prod smoke; done with the user's go-ahead (creates external services); the front page card links the game |

## Later, to consider (not now)

- Larger grids (8 × 7, 9 × 7) as an option.
- A "pop out" rule (a player may take their own disc from the bottom row instead of dropping).
- A perfect-play bot with an opening book.
- A hint that tells whether the position is won, drawn or lost.
