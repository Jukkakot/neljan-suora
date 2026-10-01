# Roadmap

Planned changes in order. Each is an OpenSpec change (`/opsx:propose <name>`), specified ahead in
the spec phase and then implemented. Status: **done**, **specced** (proposal, design, specs and
tasks written), **planned**.

| # | Change | Status | What |
|---|---|---|---|
| 0 | `create` | done | Made from the game-kit template: workspaces, kit packages, the placeholder game Ristinolla, screens, docs, OpenSpec, `.claude`, CI/deploy, E2E, tournament |
| 1 | `theme` | planned | Agree the theme with light and dark mockups: visual concept, palette and seat colours, motion at the end, the voice of texts and names; tokens, icons and copy follow, product.md and nfr.md record it |
| 2 | `rules-engine` | planned | Replace Ristinolla with the real rules in `packages/rules` (pure, seeded, contract in `contract.ts`) and the protocol's move and options; property tests |
| 3 | `game-ui` | planned | The real board and move controls in the client shell (view model, client definition, one deliberate confirm), E2E smoke on the real moves |
| 4 | `bot-v1` | planned | The bot adapter and evaluation for the real rules, a strength requirement in `strength.json`, tournament green |
| 5 | `first-deploy` | planned | The setup checklist (docs/operations.md): GitHub repo, Pages, Render, Axiom, prod smoke; done with the user's go-ahead (creates external services) |
