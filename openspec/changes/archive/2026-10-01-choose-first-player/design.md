# Design

## Context

`startGame(seed, seats)` draws the first seat from the seed. A device game starts in the kit's
`LocalRoom`: `newGame` calls `rules.start(seed, seats, options)` with the options passed to
`playBots(nickname, bots, options)`; the person is always seat 1, the bot seat 2. The kit's local
`rematch()` starts the next game with the same seats and options and tells the rules nothing about
the previous game (product.md already lists "letting the other seat start" as a kit TODO). Online
rooms validate options with the protocol's strict `optionsSchema` (no options accepted).

## Goals / Non-Goals

**Goals:** the person picks Minä / Botti / Arvonta for a device game against the bot; the choice is
remembered; "Pelaa uudelleen" lets the other seat start.

**Non-goals:** a choice in friends' games or watched bot games; changing online rooms, the protocol
or the server; a rematch alternation for online games.

## Decisions

### 1. Rules: an optional first seat in the options

The rules' options become `{ firstSeat?: number }` (`packages/rules/src/contract.ts`). A helper
`firstTurn(seed, seats, firstSeat?)` returns `firstSeat` when it is one of the seats, else the
seed's draw exactly as today (so every existing seed keeps its starter); `startGame` uses it and the
contract's `start` passes `options.firstSeat`. The protocol's `NeljanSuoraOptions` and its strict
`optionsSchema` stay as they are: online games can never carry the option, and a `{}` options value
fits the rules' type.

Alternative: a "who started" field on `Game` — rejected: it changes the saved and synced game shape
for something the options and the seed already determine.

### 2. Kit: an optional `local.rematchOptions` hook

`@game-kit/client`'s client definition gets
`local.rematchOptions?(previous: G, options: O): O`; `LocalRoom.rematch()` starts the next game
with `rematchOptions?.(this.game, options) ?? options`. Optional, so other games are unaffected. The
kit's `template/` gets nothing (its game has no starter choice); the kit README mentions the hook.
Released as **v0.3.0** (`npm run release -- 0.3.0` in `../game-kit`, then `npm run kit:use -- 0.3.0`
here). Neljän suora implements it: the previous game's starter is
`firstTurn(previous.seed, previous.seats, options.firstSeat)`; the next options name the other seat.
So Arvonta becomes a fixed first seat from the second game on (the user's choice: the rematch
alternates).

### 3. Client: the choice and its memory

- **Values:** `"me" | "bot" | "random"`; mapped to `firstSeat` 1, 2 or none when the game starts
  (`playBots(nickname, 1, options)` in `useGameSession`).
- **Memory:** its own localStorage key `neljan-suora.firstPlayer` (read with try/catch like the
  settings; garbage or blocked storage → `"random"`). Not part of Settings: settings are comfort
  choices that never change the rules. Saved when the person changes the choice.
- **UI:** in the start screen's bot region, between the "Pelaan itse" switch and the start button,
  shown only while "Pelaan itse" is on: a label "Kuka aloittaa?" and a group of three buttons
  "Minä" / "Botti" / "Arvonta" with `aria-pressed`, the same segmented look as the bots' speed
  buttons (primary = selected), each ≥ 44 px tall. English: "Who starts?" / "Me" / "Bot" / "Draw".
- **Dev shortcut:** `?dev=1v1` uses the remembered choice (it calls the same `playBots`).
- **Logs:** nothing new; `client.local.started` already carries the options and `startSeat`.

### NFR

- **Tests:** rules: `firstTurn` with and without a first seat (property: no first seat → same
  starter as before for 200 seeds; a first seat outside the seats is ignored). Client: the stored
  choice (default, round trip, garbage); `rematchOptions` (person started → bot starts; drawn bot
  start → person starts); start screen (choice shown only with "Pelaan itse" on, selection
  remembered, `playBots` gets the matching options). Kit: `LocalRoom` rematch uses the hook. E2E
  smoke unchanged (must pass; it plays whoever starts).
- **Performance / abuse:** none (device only).

## Risks / Trade-offs

- [Kit release needed] → a small, optional hook; the release is the kit's usual flow.
- [Arvonta then a fixed alternation in rematches] → that is the user's choice ("Vuorotellen").

## Migration Plan

Old saves have `{}` options and keep their seed-drawn starter. Rollback: revert the commits (the kit
hook is optional and harmless when unused).
