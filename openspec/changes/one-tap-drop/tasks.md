# Tasks

## 1. Client

- [ ] 1.1 `GameScreen.tsx`: `tap` sends at once; `choice` → `hinted` used by "Vihje" only; status line per design decision 5
- [ ] 1.2 `Board.tsx`: `chosen` → `hinted` (lit column + ghost, not `aria-pressed`), label suffix ", vihje"; update the component doc comments
- [ ] 1.3 `MoveControls.tsx`: remove "Aseta" and its props; bar holds "Peru" and "Vihje"; `HintButton` doc comment
- [ ] 1.4 Locales fi/en: remove `move.confirm`, `move.ready`; new status, hint title, `board` hint suffix and `tips.place` (design decision 5)
- [ ] 1.5 Tests: rewrite the screen tests for "One tap drops" (incl. a quick second tap sends once) and "The hint shows a column" (shows the ghost, sends nothing; tapping another column sends that one); fix `Berry.test.tsx` label test

## 2. E2E

- [ ] 2.1 `e2e/tests/helpers.ts` `playFirstColumn`: one tap, landing cell read before the tap; E2E smoke green
- [ ] 2.2 UI check (`playwright-mobile`, portrait, light and dark): a one-tap move against a bot, the hint's ghost and status line, the bar without "Aseta"

## 3. Docs

- [ ] 3.1 `openspec/context/product.md`: Board and Mobile lines (one tap, no confirm; the hint shows a column)
- [ ] 3.2 `docs/architecture.md` (client board paragraph) and `docs/development.md` (E2E move helper line: name and one tap)
- [ ] 3.3 At archive: `game-board` main spec Purpose line without "one confirm"
