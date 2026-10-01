# Development

## Setup and run — Implemented

- Requires Node 22 (`.nvmrc`) and npm 11. `npm install` at the repo root installs all workspaces.
- Ports are the game's own (not the Colyseus/Vite defaults), so its dev servers run next to other
  games'.
- `npm run dev` starts both:
  - server on http://localhost:2587 (`/health`, `/monitor`, `/playground`)
  - client on http://localhost:5193 (also on the LAN for phones: see the Vite output)
- In development the client is served at `/`; production uses `/neljan-suora/`.
- Two browser tabs are two players (session per tab).
- Games against a bot (and `?dev=1v1`) run in the browser without the server; online play,
  watching (`?dev=0v2`) and the waiting room need it.
- PWA: the service worker is off in `npm run dev`. To try install and offline start:
  `VITE_SERVER_URL=http://localhost:2587 npm run build -w @neljan-suora/client && npm run preview -w
  @neljan-suora/client` (port 5194; without the URL a production build shows the crash screen), then
  DevTools → Application. Icons: edit `client/public/favicon.svg`, run
  `npm run icons -w @neljan-suora/client`, commit the PNGs.
- Logs: the terminal shows pretty lines; `logs/dev.log` has the same entries as JSON (server and
  client). Add `?debug=1` to the client URL to also get its debug entries. Clear the file only
  while the server is stopped (it keeps the file open).

### Local dev servers

Dev servers are kept running between sessions. Before a UI check or E2E run:

- Check what listens (PowerShell): `Get-NetTCPConnection -LocalPort 2587,5193 -State Listen`,
  then the owning process's command line. This checkout's `npm run dev` (`tsx watch` + Vite)
  reloads by itself, so a running one is current.
- Nothing listens: start it detached through cmd, so it outlives the session (a bare
  `Start-Process npm` dies at once; a background task leaves orphans when stopped):
  `Start-Process -WindowStyle Hidden cmd.exe -ArgumentList '/c','npm run dev > "%TEMP%\neljan-suora-dev.log" 2>&1' -WorkingDirectory <repo root>`.
- Only one side up (e.g. VS Code's Vite on 5193): start only the other,
  `npm run dev -w @neljan-suora/server` (log `%TEMP%\neljan-suora-server.log`).
- Anything else on those ports (an old build, another checkout): stop it by process id.

## Checks — Implemented

Run before every commit (CI runs the same):

```
npm run lint && npm run typecheck && npm test && npm run build && npm run size -w @neljan-suora/client
npm run e2e   # smoke test, when UI or connection code changed
```

- Lint: oxlint (root `.oxlintrc.json`), then `tools/kit/check.mjs` (game-kit must come from a
  release, see below). No formatter.
- Workspace order matters for the build: `rules`, `protocol`, the bots, `server`, `client` (root
  `package.json`).
- Bundle budget: client JavaScript ≤ 200 kB gzip, the bot worker ≤ 30 kB (size-limit, fails CI).
- Tests: Vitest in every workspace. Server test files run one at a time because each boots a
  real Colyseus server (`fileParallelism: false`).

## Game kit — Implemented

The `@game-kit/*` packages live in [`Jukkakot/game-kit`](https://github.com/Jukkakot/game-kit) (sibling checkout `../game-kit`, its own `README.md` and
`npm run check`). Neljän suora's workspaces depend on the tarballs of one release
(`https://github.com/Jukkakot/game-kit/releases/download/v<version>/…`), pinned by the lockfile.

- **Switch version:** `npm run kit:use -- 0.2.0` rewrites every `@game-kit/*` dependency and runs
  `npm install`.
- **Kit and game together:** edit in `../game-kit`, then `npm run kit:use -- local` here (packs
  the kit there and installs those tarballs: exactly what a release ships); repeat after each kit
  edit. Lint refuses to commit a local setup. When done: `npm run release -- <version>` in the kit
  (one command: version, checks, tag, push; the tag's workflow attaches the tarballs), wait for the
  Release workflow (`gh run watch`), then `npm run kit:use -- <version>` here.
- `kit:use` swaps `node_modules/@game-kit` under a running `npm run dev`: restart it afterwards.
- A kit change that breaks the contract is fixed in Neljän suora in the same piece of work. Kit changes
  are specced in the OpenSpec of the game that needs them.
- This project was made with the kit's `create-game` from its `template/`; a generic improvement
  made here is worth porting back to the template (the kit's README → Start a new game).

## Testing approach

| Level | Tools | Status |
|---|---|---|
| Rules | Vitest; fast-check available for property tests; test names follow spec scenarios | Implemented |
| Bot strength | Tournaments and strength requirements (below), outside `npm test`; heavy runs in GitHub Actions | Implemented |
| Server | Vitest + @colyseus/testing (real rooms, SDK clients in-process); `captureLogs()` asserts log lines; `test/support/game.ts`: `waitingRoom(n)`, `startedGame(startSeat)` (the start seat forced via the `adjustStart` hook). The generic room suites run in the kit repo; `server/test` keeps the game's wiring and the infra tests | Implemented |
| Game kit | In the kit repo and its CI, which also generates a game from the template and runs its checks | Implemented |
| Client | Vitest; jsdom + Testing Library for components (`// @vitest-environment jsdom`) | Implemented |
| E2E | Playwright, Galaxy S24 profile: a game against a bot on the device and a two-player online game (invite link, host starts), both played to the end | Implemented |

### Bot tournaments and strength

```
npm run tournament -w @neljan-suora/bots -- greedy brs mcts@i400 --games 100 [--colours 2] [--seed 1] [--jobs 4]
npm run strength -w @neljan-suora/bots          # the requirements in packages/neljan-suora-bots/strength.json
```

- Bots: a registry name (`random`, `greedy`, `brs`, `mcts`, `negamax`) with an optional budget, `@<n>ms`,
  `@d<n>` (search depth) or `@i<n>` (MCTS iterations). Depth and iteration budgets give identical
  results on any machine and job count; time limits do not (the report says so), so
  `strength.json` uses depth budgets only.
- Every game starts from a 2-disc random opening drawn from its seed (`openedGame`), the same for
  both seat orders, so deterministic bots do not replay one game.
- `npm run bench -w @neljan-suora/bots [-- --ms 800]`: depth reached and nodes per second of the
  negamax and of the kit's search at full width, for a quick speed check.
- The report (Markdown) goes to stdout; the JSON with every game to
  `packages/neljan-suora-bots/tournament-results/` (git-ignored) or `--out`.
- A new bot: add it to `BOTS` in `packages/neljan-suora-bots/src/tournament.ts`, then add a
  requirement "new beats previous ≥ 60 % over 200 games" to `strength.json`.

### E2E smoke

- `npm run e2e` starts the dev server and client (or reuses running ones) and runs
  `e2e/tests/smoke.spec.ts` on the Galaxy S24 profile.
- It reuses **whatever** listens on 2587/5193, e.g. a VS Code debug server started from an older
  build. When that is not the current code, stop it first, or run the server with `PORT=2600` and
  the client with `VITE_SERVER_URL=http://localhost:2600 npx vite --port 5180` and point
  Playwright's `baseURL` there.
- Each test plays in its own pool (`?pool=…`), so runs never share games.
- Make moves with `markFirstFree` (`helpers.ts`): it taps like a phone (choose, then confirm).
- In a cloud container without Playwright's own browser build, point `launchOptions.executablePath`
  at the preinstalled Chromium in a local, uncommitted config.
- On failure: screenshot and trace in `e2e/test-results/` (`npx playwright show-trace …`); CI
  uploads them as the `playwright-report` artifact. Check `logs/dev.log` for the `client.error`
  line.
- Scope: smoke only. Feature behaviour belongs in unit and room tests.
- **Production smoke:** `npm run e2e:prod -w @neljan-suora/e2e` runs `e2e/tests/prod.spec.ts` against
  the live site (`PROD_URL`, default the Pages address) with `playwright.prod.config.ts`; CI runs
  it after every deploy (see operations → Release flow).

## Debugging — Implemented

- **VS Code**: Run and Debug → "Server" (tsx with the `source` condition, so breakpoints in
  `packages/rules` work), "Client" (Chrome + Vite), or "Full stack".
- **Dev shortcut:** `http://localhost:5193/?dev=1v1` starts a game against a bot, `?dev=0v2` a
  game of bots to watch, at once; development builds only.
- **Lint hook** (for Claude): `.claude/hooks/lint-edited.mjs` runs oxlint on every `.ts`/`.tsx`
  file Claude edits and hands problems back at once.
- **Playwright MCP** (for Claude): `playwright-mobile` = Galaxy S24 (default for UI checks),
  `playwright-ios` = iPhone 15, `playwright` = desktop; all headless and isolated. UI checks cover
  both the light and the dark theme (Marjat) when colours or surfaces change.
- **Render MCP** (for Claude): deploys, service details, production logs. See
  [operations.md](operations.md).

## Conventions — Implemented

- English for all code, identifiers, file and package names; UI text Finnish first + English,
  always through i18next.
- Prefer established libraries over hand-written plumbing; game rules are our own code.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:` …), directly on `main`.
- Reference device: Samsung Galaxy S24 (360×780 CSS px); Android primary, iOS must work; tap
  targets ≥ 44 px.
- Planning: OpenSpec (`/opsx:*`). Each change updates the wiki pages it affects.
