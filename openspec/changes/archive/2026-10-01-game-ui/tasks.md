# Tasks

## 1. Board

- [x] 1.1 Rebuild `client/src/game/Board.tsx` as seven column buttons with stacked holes (`data-column`, `data-cell`, `data-owner` kept), ghost in the landing hole, lit chosen column, disabled full columns; column labels (fi/en) per design, old per-cell keys removed. Verify: render tests (label "Sarake 3: puolukka, mustikka", full column disabled, chosen label) replacing the per-cell ones in `Berry.test.tsx`.
- [x] 1.2 Drop motion in `Board.module.css` (`--fall`, `--pitch`, `drop` then `squish`, reduced-motion guard) and the faded rest on a win; a `--column-light` token for light and dark in `tokens.css` (`tokens.test.ts` stays green). Verify: UI check (task 3.2).
- [x] 1.3 `GameScreen` screen tests read column buttons (choose, change, confirm, hint, full column). Verify: `npm test -w @neljan-suora/client`.

## 2. E2E

- [x] 2.1 `playFirstColumn` taps the leftmost enabled column button twice and waits for the disc. Verify: `npm run e2e` green.

## 3. Check, UI, docs, card

- [x] 3.1 Run the check chain once and fix failures.
- [x] 3.2 UI check on `playwright-mobile` portrait, light and dark: a bot game mid-play with a ghost (`/?dev=1v1`), and a won game watched (`/?dev=0v2` at 4×): faded rest, ring, falling leaves; one landscape glance. Screenshots under `.playwright-mcp/`.
- [x] 3.3 Docs: `docs/architecture.md` (the board line and "A move"), `product.md` Controls (as built); roadmap `game-ui` done.
- [x] 3.4 Refresh the front page card: `npm run homepage-card -- --push` (dev server running).

## Notes
