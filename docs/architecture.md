# Architecture

How the solution is built: structure, flows and contracts. Details (function lists, UI texts,
component behaviour) live in the code and in [`openspec/specs/`](../openspec/specs/); this page
only points to them. Status markers: **Implemented** = on `main`; **Planned (`change`)** = agreed,
delivered by that roadmap change.

> The rules (`rules-engine`) and the board (`game-ui`) are Neljän suora's own; everything around them
> is the game kit's and works as described.

## Overview — Implemented

```
 Browser (mobile first)                          Render (free, Frankfurt)
┌──────────────────────────────┐   WebSocket   ┌─────────────────────────────┐
│ client  React 19 + Vite      │◀────────────▶│ server  Colyseus 0.18        │
│  i18next (fi default, en)    │   + HTTP      │  one Room per game + lobby  │
│  games vs bots run here      │               │  authoritative: validates   │
│  (LocalRoom)                 │               │  every command              │
└──────────────┬───────────────┘               └──────────────┬──────────────┘
               │ imports                                       │ imports
               ├────────────▶ packages/rules ◀─────────────────┤
               │              pure, deterministic game logic   │
               └────────────▶ packages/protocol ◀──────────────┘
                              shared contract: codes, schemas, log events
```

- **Game kit:** the generic room, lobby, bot runner, session, device-game logic and the bot
  library are the `@game-kit/*` packages from [`Jukkakot/game-kit`](https://github.com/Jukkakot/game-kit),
  installed as release tarballs of one version ([development.md](development.md#game-kit--implemented))
  and driven by the [game contract](#game-contract--implemented); Neljän suora implements the contract.
- **Monorepo**, npm workspaces, TypeScript everywhere. Hosting: client on GitHub Pages, server on
  Render ([operations.md](operations.md)).
- **No database.** Server games live in memory and are lost on restart, deploy or sleep.
- **Games with bots from the start screen run on the device**, played or watched; online games,
  watching them and the waiting room use the server.
- **Bots** are computed in a browser's Web Worker: on the device for games against bots, by the
  host's browser (the bot runner) for online games, where the server only validates their moves and
  plays the rules' fallback move itself only when no runner answers.

## Workspaces — Implemented

| Workspace | Responsibility | Must not |
|---|---|---|
| `@game-kit/protocol` (kit) | The game contract (`GameRules`), generic codes, payloads, join options and their schemas, close codes, turn rules (clock, hold, kick), client log events. | Know any game. |
| `@game-kit/server` (kit) | `LoggedRoom`, the command wrapper, room ids, server logging, the watch route, `LobbyState` and `KitGameRoom` (seats, host, bots, runner and fallback, clock, kick, autoplay, spectators, rematch, options). | Know any game's rules or synced data. |
| `@game-kit/client` (kit) | `useKitSession`, `LocalRoom` (device games, undo, the versioned save), `toLobbyView`, the bot runner, the stores, server wake-up, the open-games list, client logging; configured by the game (`configureKit`). | Pull zod or Colyseus schema into the bundle. |
| `@game-kit/bots` (kit) | Game-independent bot brains: a game interface, budgets, players (greedy, best-reply search, MCTS), the Web Worker harness, the tournament core (schedule, Elo, report). | Know any game. |
| `packages/rules` | Game rules as pure functions on plain data. Randomness only from an injected seed (`rng.ts`). `neljanSuoraRules` (`contract.ts`) is the contract's rules part over `game.ts`. | Depend on React, Colyseus or any I/O. |
| `packages/protocol` | The game's part of the wire, re-exporting the kit's: its error codes, the move and options schemas, its client log events. zod schemas sit in `*-schema.ts` modules, so the client bundle has no zod. | Contain game logic. |
| `packages/neljan-suora-bots` (`@neljan-suora/bots`) | The adapter to `@game-kit/bots`, the evaluation, the worker entry point `chooseMove`, the tournament bot registry and formats; Node-only tournament CLI in `cli/`. | Do I/O in `src/` (the client bundles it). |
| `server` | The game's room (its server definition on `KitGameRoom`), the app and its HTTP routes. Source of truth. | Trust the client; compute bots (beyond the fallback). |
| `client` | Rendering, input, the view model and client definition, i18n, settings. | Hold authoritative state of server games. |

**No build step between packages:** the `packages/*` workspaces export a `source` condition pointing
at `src/index.ts`; Vite, Vitest and `tsx` resolve it. The server production build uses `dist/`. The
kit packages come built (`dist/` only).

## Server — Implemented

- Entry `server/src/index.ts` (port `PORT`, default 2587); rooms and routes in `app.config.ts`.
- Rooms: `game` → `GameRoom` (the game's `neljanSuoraServer` definition on the kit's `KitGameRoom`;
  `filterBy(["pool"])`, realtime listing on) and `lobby` → Colyseus' built-in `LobbyRoom` (pushes
  the game listing to start screens).
- HTTP: `POST /watch` (a seat reservation for a spectator), `GET /health` (`{ status,
  rulesVersion, version, builtAt }`; Render's health check and the client's wake-up request),
  `POST /client-logs`. Development only: `/monitor`, `/playground`. CORS: `ALLOWED_ORIGINS`.

### Commands and rejection contract — Implemented

- Clients send `room.request(name, payload)` and always get `CommandResult`: `{ ok: true }` or
  `{ ok: false, code }`. Every command writes exactly one audit line (`cmd.accepted` /
  `cmd.rejected` / `cmd.failed`); a handler rejects **before changing state**.
- The move rides on the kit's `move { move }` (and `botMove { seat, move }` from the bot runner),
  validated by the game's `moveSchema` and then the rules' `play`; the options ride on
  `setOptions { options }`.
- **Adding a game command:** codes in `protocol/src/game-codes.ts`, schema in `game-schema.ts`;
  `GameRoom` adds it to `messages` (spread `kitMessages()`); a method in `useGameSession` over
  `command(name, payload)`; `errors.<CODE>` in fi/en. A command every game needs belongs in the kit.

## Game flow — Implemented

```
 create/join ──▶ waiting ──start──▶ play (turn → next seat …) ──▶ finished
 (nickname)     host = 1st joiner   └─ 120 s turn clock ─┘  end: the rules say so, or last player standing
```

- **Joining:** join options `{ nickname, pool?, watch?, botSeats?, options? }` (strict) are
  validated on create and join. Seats: lowest free, up to the rules' `seatRange`, taken only in the
  waiting room. The first joiner hosts; the host leaving the waiting room closes it.
- **Start:** the host starts once the rules' least seat count is met; the room calls
  `rules.start(seed, seats, options)` and from then on only the contract: `seatOnTurn`, `play`,
  `removeSeat`, `isOver`, `winners`, `end`.
- **Turn clock:** 120 s per turn; expiry lets the others `kick` the slow player.
- **Bots:** the host seats bots (Kettu, Ilves, Pöllö, Näätä). The bot runner (the host while
  connected, else the lowest connected person) computes bot moves and sends `botMove` after the
  1 s pause; with no runner, or a silent one 10 s after the pause, the room plays the rules'
  `fallbackMove` (`bot.fallback`). A person may hand their seat to the bot (autoplay); a dropped
  person is auto-played during the 5-minute seat hold.
- **End:** `game.finished` with the winners; "Pelaa uudelleen" creates one rematch room for all.
- **Spectators** watch running games; while only bots play they set the speed.

## Game contract — Implemented

- **Rules part** (`GameRules<G, M, O>` in `@game-kit/protocol`, pure, shared by server and device
  games): `seatRange`, `start`, `seatOnTurn`, `turnFacts`, `play`, `removeSeat`, `isOver`,
  `winners`, `end`, `fallbackMove`, `finishFacts`, `moveText`. Here: `neljanSuoraRules`.
- **Server part** (`GameServerDefinition` in `@game-kit/server`): the move and options schemas,
  default options, the synced child schema with `reset(options, child)` / `sync(game, child)`, and
  optional `optionsChange`, `turnLogFacts`, `stateFacts`. Here: `neljanSuoraServer` in `GameRoom.ts`.
- **Client part** (`GameClientDefinition` in `@game-kit/client`): `toView(state, lobby)`,
  `askBot(view, speed, seed)` for the online runner, and `local` for device games (save key and
  check, seats, `parseMove`, `askBot(game, speed)`, `child`, `turn`, `logFacts`). Here:
  `client/src/session/neljanSuoraClient.ts`.

## State sync — Implemented

- Synced: the kit's `LobbyState` (players, `phase`, `turnSeat`, `turn`, `hostSeat`, `winners`,
  `turnDeadline`, `turnExpired`, `botRunnerSeat`, `spectators`, `botSpeed`, `rematchRoomId`) and
  `game`, the game's child (`server/src/rooms/schema/GameState.ts`; `cells`, the disc per cell of
  the 7 × 6 grid, row-major with the top row first, and `line`, the winning cells). No hidden information.
- The client rebuilds the rules' game from it (`GameView.game`), so the hint and the bot runner use
  the same rules as the server. UI-only state (the chosen column) never crosses the network.

## Rules package — Implemented

- `rng.ts`: the seeded random source (`createRng`, `shuffle`); the same seed always gives the same
  game, so the server's fallback moves and device games are reproducible from `dealSeed`.
- `game.ts`: gravity four in a row as plain JSON data (`cells`, `line`, …); a move is `{ column }`.
  `startGame` (the seed draws the starter), `playMove` (refusals `COLUMN_FULL`/`INVALID_COMMAND`
  change nothing), `legalColumns`, `landingCell`, `removeSeat`, `endGame`, `randomMove`.
- `bitboard.ts`: the grid constants, `LINES` (the 69 lines of four) and the bitboard win check: a
  seat's discs in the 7 × (6 + 1) layout split into two 32-bit words (`lo` columns 0–3, `hi` 4–6),
  so JavaScript's bitwise operators work; property tests check it against a plain scan. The bots'
  searcher uses the same layout.
- `contract.ts`: `neljanSuoraRules`, the contract over `game.ts`; no rules live there.
- `testing.ts` (`@neljan-suora/rules/testing`): fixtures for the other workspaces' tests.

## Bots — Implemented

- **`@game-kit/bots`** (kit): a game plugs in as a `MultiplayerGame` (player to move, legal moves,
  play, the players still in, a player's moves out of turn, a cheap move key). A `Bot` answers
  `choose(state, budget, rng)`; `Budget` is plain JSON (`timeMs`, `depth`, `iterations`). Players:
  `greedyBot`, `bestReplyBot` (best-reply search, iterative deepening), `mctsBot`, `randomBot`;
  `rankMoves` for hints; the worker harness; tournaments and Elo.
- **`@neljan-suora/bots`**: `neljanSuoraGame` (the adapter), `evaluate`, the kit's players as
  baselines, `playGame`, and `chooseMove(game, budget, seed | rng, bot?)`.
- **The game's own searcher** (`src/negamax/`, `bot-v1`): negamax with alpha-beta on the two-word
  bitboards, made and taken back in place; immediate wins, forced blocks and "no disc under the
  other's winning cell" decided before searching; forced replies cost no depth; a typed-array
  transposition table (2^20 entries, ~12 MB, cleared per answer so a depth and seed always give the
  same column); threats-then-centre move order; iterative deepening under the budget. The leaf
  rating counts each column's lowest winning cell by row parity (zugzwang) plus cell weights.
  Measured at 800 ms on a desktop: ~2.3 M nodes/s, depth 14–16 in the opening (the kit's search at
  full width: 9–10). Reusable for other two-player games (a kit candidate): the iterative deepening
  with a time check, the typed-array table, exact root ties broken by the seed.
- **The perfect bot** (`src/perfect/`, `perfect-bot`) is **`devicePlayer`**, the bot people play
  against: a win/draw/loss solver (null-window search on the same bitboards, its own bounds table,
  a node limit) settles the position, from the **opening book** when the position is in it; the
  negamax then chooses among the columns of the best outcome (all columns when lost or unsettled).
  The book is Pascal Pons' `7x6.book` (AGPL-3.0, 33.5 MB): exact scores of positions up to 14
  discs, committed under `packages/neljan-suora-bots/book/` and fetched by the client on the first
  bot question; the bot plays the columns of the best score (soonest win), and past the book the
  solve settles positions within `SOLVE_NODES` (1.5 M nodes, ~2 s on a mid-range phone).
- **Tournaments:** the bot registry with budgets (`perfect` = depth 8 + `SOLVE_NODES`,
  `negamax@d8`, `brs@d4`, `mcts@i400`, `greedy@200ms`), formats, the random opening,
  `playTournamentGame`; `cli/` runs games on worker threads and gives `perfect` the book from disk.
  Requirements in `strength.json` (negamax beats random ≥ 98 %, negamax@d8 beats the kit's `brs@d4`
  ≥ 90 %, perfect beats negamax@d8 ≥ 80 % and never loses a game it judged won or drawn at its first
  move).
- **In the client** (`client/src/bots/`): `bot.worker.ts` serves `chooseMove` in a module Web
  Worker (own size-limit entry); `askBotWorker` asks it and answers in the page where no worker can
  run; "Vihje" asks it too. Budget 3 s and `SOLVE_NODES` (both divided by the watching speed); the
  move still shows after the 1 s pause, so only an unsettled position makes the bot think longer.
  The opening book is its own hashed asset, not in any bundle: the page fetches it on the first bot
  question of the visit (that question waits for it up to 1.5 s), hands it to the worker once, logs
  `client.warn` `bot.book` once if it fails; the service worker keeps it (runtime `CacheFirst`, not
  precached), so later visits play from it offline.

## Client — Implemented

```
client/src/
  App.tsx       StartScreen → WaitingRoomScreen (phase waiting) → GameScreen
  screens/      the three screens
  kit.ts        configureKit: storage prefix "neljan-suora", server URL, version, key log events
  session/      useGameSession (the kit's useKitSession + move), viewModel (toView: state.game +
                lobby view → GameView), neljanSuoraClient (the client definition), devShortcut
  bots/         the bot worker and its client
  game/         Board and MoveControls, turn line, player strip, result table,
                generic controls (undo, hint, kick, leave, autoplay, spectate, game id badge)
  tips/         first-game tips and the start screen's reset link
  settings/     device settings store, settings screen, theme, generated sounds, turn alert
  motion/       generic motion helpers: board diff, useLastMove, useEnded, useCountUp, LeafFall
  ui/           tokens.css (theme "Marjat", light + dark; tokens.test.ts checks contrast) and shared components
  i18n/ config.ts CrashBoundary.tsx
```

- **Server state is the truth.** The kit's `toLobbyView()` and the game's `toView()` turn synced
  state into an immutable `GameView` (`LobbyView<SeatView> & NeljanSuoraView`); components render it.
- **UI foundation:** every colour, spacing and radius is a token in `ui/tokens.css`; CSS Modules;
  anything shown twice is a shared component (`Berry` = a seat's piece everywhere; `SeatMark` is its small fixed-size form).
- **A move:** the board is seven column buttons (each the grid's height, labelled with its berries
  bottom up); one tap drops the berry (a tap while a move is on its way is ignored); "Vihje" lights
  the search bot's column with the ghost berry where it would land, without playing it. A new
  berry drops down its column (CSS, `--fall` slots in container units) and squishes; once won, the
  berries outside the line fade. Phones in landscape and wider screens put the board beside the rest.
- **Session:** a per-tab reconnection token rejoins after a reload; a seated player's unfinished
  game is remembered, so a newly opened app offers "Jatka peliä".
- **Local play:** a game against bots is the kit's `LocalRoom` with the game's definition, the
  same `GameRoomLike` as a Colyseus room: same synced-state shape, same `CommandResult`s, bots from
  the worker, "Peru" (undo), no turn clock. Saved in localStorage (`neljan-suora.localGame`) after
  every step; a save that fails `checkGame` is dropped. Watched bot games are never saved.
- **Motion:** the last move comes from a board diff (`useLastMove`); the end celebrates only when
  `useEnded` saw it happen. `prefers-reduced-motion` stops all of it.
- **Layout:** phone portrait stacks turn line, players, board and controls; from 900 px landscape
  the board sits left and the rest beside it.
- **PWA:** `vite-plugin-pwa` (auto-update service worker, off in `vite dev`); icons generated from
  `public/favicon.svg`.
- **Early wake-up:** the start screen fetches `/health` once per load so a sleeping server wakes
  while the player types; server join actions wait for it (device games do not).
- **i18n:** Finnish is the key source of truth (type-checked), a test enforces fi/en parity.
- **Logging:** pino browser build, batched to `POST /client-logs`; see
  [operations.md](operations.md#logs--implemented).
