# Tasks

## 1. Tokens and type

- [ ] 1.1 Replace the values in `client/src/ui/tokens.css` with the Marjat palette (design → Palette), light and both dark blocks identical, rename `--snow`/`--frost*` to `--leaf`/`--shine`/`--out*` and update every user (grep finds none left); rewrite the header comment for Marjat. Verify: `npm run typecheck -w @neljan-suora/client` and a grep for `--snow\|--frost` is empty.
- [ ] 1.2 Add `client/src/ui/tokens.test.ts`: parses `tokens.css` and checks, per theme, text and muted on bg/surface ≥ 4.5:1, both berries on `--cell` ≥ 3:1, that the two dark blocks are identical, and that no seat is yellow (hue 40–70°) and `--board` is not blue (hue 190–260°). Verify: the test passes; nudge values if needed and record them in design.md.
- [ ] 1.3 Add `@fontsource-variable/fredoka` (latin + latin-ext), a `--font-display` token, and use it for the start screen title, screen headings and the end-of-game line. Verify: `npm run build` and `npm run size -w @neljan-suora/client` stay green.

## 2. Berry disc and board

- [ ] 2.1 Add `client/src/game/Berry.tsx` (+ CSS module): seat colour, highlight, crown on seat 2, optional `isMe` ring; make `SeatMark` render it. Verify: a render test that seat 2 has the crown and seat 1 does not.
- [ ] 2.2 Restyle `Board` as the birch crate with round moss holes; pieces and the faded preview use `Berry` (drop the tabler cross and ring); the winning line gets the `--shine` ring; the last move gets the centre dot and the squish (≤ 250 ms, none under reduced motion). Cell labels name the berry. Verify: a render test that taken cells read "puolukka"/"mustikka"; tap targets stay ≥ 44 px in the UI check.

## 3. End-of-game motion and copy

- [ ] 3.1 Turn `motion/Snowfall` into `LeafFall` (leaf shape, sway, `--leaf`, same seeded generator, 2.5 s, reduced-motion guard) and show it only on a win; the result table's sweep uses `--shine`. Verify: a test that leaves fall on a win and not on a draw (update `motion.test.ts` / screen tests that referenced snow).
- [ ] 3.2 Update the fi and en locales per design → Copy (berry words, "Aseta", end-of-game lines, split `result.drawTitle` if the key is shared). Verify: `locales.test.ts` passes and existing screen tests are updated to the new strings.

## 4. Icon, manifest, front page card

- [ ] 4.1 Draw the new `client/public/favicon.svg` (birch square, lingonberry, crowned blueberry, leaf), set the icon backgrounds in `pwa-assets.config` and the manifest colours in `vite.config.ts`, run `npm run icons -w @neljan-suora/client`. Verify: the regenerated PNGs and `.ico` are committed and the favicon shows in the UI check.

## 5. Check, docs, card

- [ ] 5.1 Run the check chain once (`npm run lint && npm run typecheck && npm test && npm run build && npm run size -w @neljan-suora/client`) and the E2E smoke; fix failures (smoke selectors relying on the old marks or "Merkitse").
- [ ] 5.2 UI check on `playwright-mobile`, portrait, light and dark: start screen, a bot game mid-play (`/?dev=1v1`: berries, chosen preview, last-move dot) and a won game (shine, leaves). One screenshot per state under `.playwright-mcp/`.
- [ ] 5.3 Docs: `product.md` → Theme "Marjat" (concept, seats, motion, voice; drop the TODO), `nfr.md` → Theme, `.claude/CLAUDE.md` theme line, `docs/README.md`, `docs/architecture.md` (tokens.css line), `docs/development.md` (UI check line); mark `theme` done in `openspec/context/roadmap.md`. Kit TODO noted here: the template's `Snowfall` could take a shape (square / leaf / none). Verify: grep for "Placeholder" in docs, context and CLAUDE.md finds only historical mentions.
- [ ] 5.4 Refresh the games front page card with `npm run homepage-card -- --push` (dev server running). Verify: the card on https://jukkakot.github.io shows the berry board in dark.
