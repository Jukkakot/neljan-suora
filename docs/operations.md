# Operations

## Environments — Implemented

Live since 2026-10-01 ([setup checklist](#setup-checklist) done).

| | URL | Hosted on | Deploys when |
|---|---|---|---|
| Client | https://jukkakot.github.io/neljan-suora/ | GitHub Pages | push to `main` touching `client/`, `packages/rules/`, lockfile ("Deploy client" workflow) |
| Server | https://neljan-suora-server.onrender.com (also the repository variable `VITE_SERVER_URL`) | Render free web service `neljan-suora-server` (`srv-dav70tvpn0mc73afd0i0`, Frankfurt) in the shared workspace `tea-d7vbs7l7vvec73dbddt0` | green CI on `main` when the server code (`server/`, `packages/rules/`, `packages/protocol/`, lockfile, `render.yaml`) differs from the live server's commit: the `deploy-server` job in CI calls Render's deploy hook (secret `RENDER_DEPLOY_HOOK_URL`); Render auto-deploy is off |

- Game kit: Render, Pages and CI download the `@game-kit/*` release tarballs from public GitHub
  Releases of `Jukkakot/game-kit` during `npm ci` (no token). A kit bump changes the lockfile, which
  deploys both sides.
- **Free tier:** the server sleeps after ~15 min without traffic; the next request wakes it in
  about a minute. Sleeping, restarting or deploying loses all games in memory (accepted, budget
  0 €).
- Service definition is code: [`render.yaml`](../render.yaml) (Blueprint). Change settings there,
  not in the dashboard.

## Setup checklist

**Done 2026-10-01** (all steps; step 4 through roadmap `shared-logs`).

`create-game` created nothing outside this folder. Each step says what needs it, so it can wait
until the first deploy, or be skipped while the game runs locally only. Commands assume the GitHub
CLI (`gh`) is logged in as the repo owner. Until a step is done, the workflows that need it skip
with a notice instead of failing: the client deploy and the production smoke wait for
`VITE_SERVER_URL`, CI's `deploy-server` job also for `RENDER_DEPLOY_HOOK_URL`.

1. **GitHub repo** (public, so Actions minutes are free; CI runs from then on):
   `gh repo create Jukkakot/neljan-suora --public --source . --push`. Then put the game on the games
   front page: `npm run homepage-card -- --push` with `npm run dev` running (see
   [Games front page](#games-front-page)).
2. **GitHub Pages** (the client): `gh api -X POST repos/Jukkakot/neljan-suora/pages -f build_type=workflow`
   (source "GitHub Actions"), and once the server exists
   `gh variable set VITE_SERVER_URL --repo Jukkakot/neljan-suora --body https://<service>.onrender.com`
   (the client build and CI's health checks read it).
3. **Render** (the server): dashboard → New → Blueprint → pick the repo (reads `render.yaml`, free
   plan, Frankfurt). Then Settings → Deploy Hook → copy it and
   `gh secret set RENDER_DEPLOY_HOOK_URL --repo Jukkakot/neljan-suora` (paste); CI's `deploy-server`
   job uses it. Check that `ALLOWED_ORIGINS` in `render.yaml` holds the Pages origin.
4. **Axiom** (production logs): nothing to create. The games share the dataset `games` and one
   ingest-only token (game-kit README → Logs): copy it from the user env var `AXIOM_GAMES_TOKEN`
   into the Render service's `AXIOM_TOKEN` (Render MCP `update_environment_variables`, never
   printed). The shared dashboard picks the game up by itself.
5. **Production smoke:** run the `prod-smoke` workflow once by hand
   (`gh workflow run prod-smoke.yml`); it runs after every deploy from then on.

The URLs, Render ids and the date are under [Environments](#environments--implemented).

## Release flow — Implemented

commit → push to `main` → CI (lint, typecheck, tests, build, bundle size, E2E smoke) → Pages
deploy (client) and Render deploy hook (server, CI's `deploy-server` job after green checks) →
**production smoke** (`prod-smoke.yml`: waits until the live server's `/health` version and the
client's `version.json` carry this commit's code, then `npm run e2e:prod -w @neljan-suora/e2e`
plays a move against a bot on the device and starts a server game with a bot on the live site;
also daily at 05:17 UTC and by hand). No staging environment.

**Service worker:** the client is a PWA. A phone with the app open or installed picks up a new
Pages deploy on its next load (the new worker takes over and reloads the page once). To rule out a
stale client when checking a deploy, compare the footer's "Client …" build time.

### Bot tournaments — Implemented

`.github/workflows/tournament.yml`, separate from CI so a weaker bot never blocks a deploy:

- **strength** job: on pushes to `main` and pull requests that touch
  `packages/neljan-suora-bots`, `packages/rules`, the lock file or the workflow. Runs
  `npm run strength`; red when a requirement is missed. Report on the run's summary page, JSON as
  the `strength-results` artifact (30 days).
- **tournament** job: Actions → Bot tournament → Run workflow, with bots (space-separated),
  games per pairing, format and first seed. Report on the summary page, JSON as the
  `tournament-results` artifact.

### After a deploy (manual checks)

1. Open the Pages address on the phone. If the server was asleep, "Luo peli" is greyed out while
   the server wakes (up to about a minute). The footer's "Client …" and "Server …" build times must
   be newer than the push. Tap "Luo peli" → the waiting room, you are the host.
2. Open the same page in a second tab or device: the game shows under "Liity peliin" (or open the
   invite link). Tap it → both tabs list two players; the host taps "Aloita peli" → both see the
   board, same game id.
3. The player on turn makes a move → it shows in both tabs.
4. In Axiom (or Render logs) find the game id: `game.started`, `cmd.accepted move` lines.

## Configuration — Implemented

| Name | Where | Purpose |
|---|---|---|
| `VITE_SERVER_URL` | GitHub repository variable → client build, CI health checks | Server base URL |
| `VITE_BASE` | set in deploy workflow | `/neljan-suora/` path on Pages |
| `ALLOWED_ORIGINS` | `render.yaml` env | CORS allow-list (comma-separated) |
| `NODE_ENV=production` | `render.yaml` env | Disables `/monitor` and `/playground` |
| `PORT` | set by Render | Server listen port |
| `AXIOM_DATASET` | `render.yaml` env (`games`) | Axiom dataset shared by the games; lines say which game with `game` |
| `AXIOM_EDGE` | `render.yaml` env | Edge domain of the dataset's region (`eu-central-1.aws.edge.axiom.co`); Axiom refuses ingest through `api.axiom.co` for EU datasets |
| `AXIOM_TOKEN` | Render dashboard (secret, `sync: false`) | Axiom API token, the games' shared **ingest-only** token for `games`; without it nothing is shipped |

## Logs — Implemented

All logs, server and client, are written to the server's stdout (Render's log view) and, in
production with `AXIOM_TOKEN` set, also shipped to the **Axiom** dataset `games`, shared by the user's games (30-day
retention, queryable with APL). Axiom is the main place to read them: Claude uses the Axiom MCP
(`queryApl`), people the Axiom web UI. Render's view (dashboard or Render MCP `list_logs`) is the
fallback. Shipping runs in a worker thread (`@axiomhq/pino`); a failing Axiom only loses lines,
never slows a game.

**Ready queries** (APL; narrow the time range with `where _time > ago(1d)`):

```
['games'] | where game == "neljan-suora" and room == "brave-otters-sing" | sort by _time asc          // one game's timeline
['games'] | where game == "neljan-suora" and level == "error" and _time > ago(1d)                      // errors today
['games'] | where game == "neljan-suora" and evt == "cmd.rejected" | summarize count() by code, cmd     // rejections by code
['games'] | where game == "neljan-suora" and evt == "bot.fallback" | project _time, room, seat, reason, runner
['games'] | where game == "neljan-suora" and evt == "game.finished" | summarize count() by reason, bin(_time, 1d)
```

**Dashboard for people:** the shared "Pelit – lokit" (pick the game in its Peli filter), built
by `tools/axiom/dashboard.py` in the game kit (uid `3345cc1f-c285-4c6b-a0c2-8bc7bc583971`).

**Format:** one JSON object per line, keys in this order:

```
{"level":"warn","evt":"cmd.rejected","room":"brave-otters-sing","player":"r39lF4Y3r",
 "cmd":"move","code":"CELL_TAKEN", …,"game":"neljan-suora","src":"server","ver":"a1b2c3d","msg":"…"}
```

- `level` debug/info/warn/error; production writes `info` and up (`LOG_LEVEL` overrides).
- `evt` from a fixed catalogue: the kit's server and client events (`@game-kit/server`,
  `@game-kit/protocol`), the game's own client events in `packages/protocol/src/log-events.ts`.
- `room` is the readable game id shown to players; `player` the session id; `seat` on lines about
  a seated player.
- `game` the game's name (`neljan-suora`), set in `server/src/index.ts`; `src` `server` or `client`; `ver` short git commit of the side that logged (`dev` locally).
- Errors: `err` (server) or `stack` (client) inside the line — never multi-line.
- `time`: when the server wrote the line; client lines also carry the device clock in `ts`.

**What gets logged** (the kit's catalogue; the game adds facts through its contract):

| Event | When |
|---|---|
| `http.request` | every HTTP request incl. matchmaking (`/health` only at debug) |
| `room.created` / `room.disposed` / `room.error` / `room.closed` / `room.refused` | room lifecycle, uncaught room exceptions, the host leaving the waiting room, refused joins |
| `player.joined` / `left` / `dropped` / `reconnected` / `removed` | connection changes (a dropped seat is held 5 min) and players taken out of a game |
| `game.started` / `game.finished` / `game.rematch` | the game's start (`dealSeed`, seats, the game's turn facts), end (winners, reason, the game's finish facts) and rematch |
| `spectator.joined` / `spectator.left` | a spectator came or went |
| `bot.added` / `bot.removed` / `bot.runner` / `bot.fallback` | bots in the waiting room, the seat whose browser computes bot moves, the server playing a bot move itself (`noRunner` or `runnerSilent`) |
| `autoplay.changed` / `options.changed` | the bot took over a person's seat or gave it back; the host changed the game's options |
| `turn.changed` / `turn.expired` / `phase.changed` | turn and phase changes, the 120 s running out |
| `cmd.accepted` / `cmd.rejected` / `cmd.failed` | every room command, exactly once, with code and state facts |
| `framework.log`, `server.*`, `process.*` | Colyseus's own messages, process lifecycle and fatal errors |
| `client.*` | client warnings/errors, crashes, key events (connection, rejections) |

**Client logs** are batched and sent to `POST /client-logs` (max 50 entries, 30 requests/min per
IP; IPs are never logged). Opening the game with `?debug=1` makes that one client ship its debug
and info entries too.

**Locally:** the terminal shows pretty lines and `logs/dev.log` (git-ignored) gets the JSON lines,
server and client together.

## Investigating a reported bug

Report shape: "around 14:30 in game brave-otters-sing, X happened". Games on the device show
"Oma peli" in the badge. The player copies the line from Asetukset → Vianilmoitus → "Kopioi pelin
tiedot" (id, local time, version); a device game has no server room, so only client logs can have
it (`client.local.*` info lines ship only with `?debug=1`).

1. Convert the reported local time (Europe/Helsinki) to UTC.
2. Query Axiom: `['games'] | where game == "neljan-suora" and room == "<game id>" | sort by _time asc`, with a ±15 min
   window around the reported time. If Axiom has nothing, fetch Render logs; locally, read
   `logs/dev.log`.
3. Follow the room timeline: `player.*`, `cmd.accepted`/`cmd.rejected`/`cmd.failed`,
   `client.error` (`src:"client"`), `framework.log`. Compare `ver` of client and server. Order by
   `_time` (the device clock in `ts` can be off).
4. Reproduce as a failing test (rules unit test, or room test with @colyseus/testing). For UI
   bugs, reproduce with Playwright MCP (two tabs = two players).
5. Fix; the failing test stays as a regression test. Record the root cause and the log lines
   that showed it.

## Games front page

Every game has a card on https://jukkakot.github.io (repo `Jukkakot/Jukkakot.github.io`, plain
HTML). `npm run homepage-card` takes a dark-theme screenshot of a bot game on the running dev client
and adds or refreshes the game's card (`data-game="neljan-suora"`) in a checkout next to this one (cloned
when missing); `--push` pushes it. Until the game's Pages site answers, the card says "Tulossa" and
links to the GitHub repo; rerun after the first deploy to link the game. Rerun also whenever the look
changes (theme, board).
