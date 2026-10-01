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
| 5 | `first-deploy` | done | The rest of the setup checklist (docs/operations.md): Pages, Render, Axiom, prod smoke; done with the user's go-ahead (creates external services); the front page card links the game. Axiom moved to `shared-logs` (dataset limit) |
| 6 | `one-tap-drop` | done | A tap on a column drops the berry at once in every game type; "Aseta" goes; "Vihje" only shows the column (user's request 2026-10-01) |
| 7 | `shared-logs` | done | One Axiom dataset shared by all the user's games (personal tier allows 3 datasets, all taken): lines carry which game and which side (server/client) they come from; queries and dashboards filter by it. Likely a game-kit change first; then wire this game's `AXIOM_TOKEN`, dashboard and the log query check |
| 8 | `perfect-bot` | done | The offered bot plays perfectly (user's decision 2026-10-01: replaces the searcher, no levels): a win/draw/loss solver plus a lazily fetched opening book (Pascal Pons' `7x6.book`, exact scores up to 14 discs, 33.5 MB), the searcher choosing among the best-outcome columns; up to 3 s per move; "Vihje" through the worker |
| 9 | `server-book` | done | The opening book moves to the game server (`GET /book`; the 33.5 MB download crashed the worker on a phone); the browser asks it per move with an 800 ms timeout; the status line and "Vihje" tell how each bot move was worked out (book, solved, estimate) and the certain outcome |
| 10 | `choose-first-player` | done | The person chooses who starts a game against the bot (Minä / Botti / Arvonta, remembered); "Pelaa uudelleen" lets the other seat start (kit v0.3.0 `local.rematchOptions`) |

## Later, to consider (not now)

- Larger grids (8 × 7, 9 × 7) as an option.
- A "pop out" rule (a player may take their own disc from the bottom row instead of dropping).
- A hint that tells whether the position is won, drawn or lost.
