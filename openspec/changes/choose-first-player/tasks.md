# Tasks

## 1. Rules

- [ ] 1.1 `packages/rules`: options `{ firstSeat?: number }`, `firstTurn(seed, seats, firstSeat?)`,
  `startGame` and the contract's `start` use it (design 1). Verify: unit tests — a first seat wins
  over the seed; no first seat gives the same starter as before for 200 seeds; a first seat that is
  not seated is ignored; `npm run typecheck` passes for server and client (protocol options unchanged).

## 2. Game kit

- [ ] 2.1 `../game-kit`: `local.rematchOptions?(previous, options)` in the client definition,
  `LocalRoom.rematch()` uses it; README note. Verify: kit unit test (the hook's options reach
  `rules.start`; without the hook the options are reused); the kit's check passes; release v0.3.0
  and `npm run kit:use -- 0.3.0` here (design 2).

## 3. Client

- [ ] 3.1 The stored choice (`neljan-suora.firstPlayer`, default `"random"`), the mapping to options
  and `rematchOptions` in the client definition (design 2, 3). Verify: unit tests — default,
  round trip, garbage → `"random"`; person started → next first seat 2; drawn bot start → next
  first seat 1.
- [ ] 3.2 Start screen: "Kuka aloittaa?" with Minä / Botti / Arvonta while "Pelaan itse" is on;
  `playBots` gets the options; texts in `fi.json` and `en.json`. Verify: screen tests — shown only
  with "Pelaan itse" on, the selection is remembered, "Pelaa bottia vastaan" passes the matching
  options; UI check (`playwright-mobile`, portrait, light and dark: a new control): the start screen
  with the choice; "Minä" → the person is on turn; "Botti" → Kettu moves first; after the end
  "Pelaa uudelleen" lets the other start.

## 4. Docs and finish

- [ ] 4.1 Wiki: `openspec/context/product.md` (who starts: the choice, the alternating rematch;
  the kit TODO is done), `docs/architecture.md` (device game start and rematch), `docs/development.md`
  (kit version 0.3.0); roadmap: add `choose-first-player` as done. Verify: `npm run lint` passes.
- [ ] 4.2 Check chain, `npm run e2e`, commit, push. Verify: all green; "How to check" in the summary.
