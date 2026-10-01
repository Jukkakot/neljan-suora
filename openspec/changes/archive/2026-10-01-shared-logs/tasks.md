# Tasks: shared-logs

## 1. Game kit: `game` field (in `../game-kit`)

- [x] 1.1 `packages/server/src/logging/logger.ts`: logger state gets `game` (default `unknown`), new export `setLogGame(name)` (no pino rebuild); `line()` writes `game` before `src, ver[, time]`; the dev pretty printer ignores `game,src,ver`. Verify: `npm test -w @game-kit/server`
- [x] 1.2 Tests in `packages/server/test/logger.test.ts`: server line and client line carry `game` after `setLogGame`, `unknown` without it, key order `level, evt, …, game, src, ver`, and shipped lines (fake Axiom stream) carry `game`. Verify: the new tests pass
- [x] 1.3 Template: `template/server/src/index.ts` calls `setLogGame("starter-game")` first; `template/render.yaml` `AXIOM_DATASET` value `games`; remove `template/tools/axiom/dashboard.py`; `template/docs/operations.md` (setup checklist Axiom step: reuse the shared token from `AXIOM_GAMES_TOKEN`, no dataset or dashboard per game; Logs: shared dataset, queries with `where game == "starter-game"`) and `template/openspec/context/nfr.md` (dataset `games`, field `game`). Verify: `npm run template:check` and `npm run check` passes and `create-game` leaves no placeholder leftovers
- [x] 1.4 Kit root `tools/axiom/`: `axiom.ps1` (copy of the template's) and `dashboard.py` built from the template script with `DS = "games"`, name "Pelit – lokit", a Peli filter (`distinct game`; fall back to a search filter if the API refuses), `game` in the log table and in the games-started tile/table. README: a "Logs (Axiom)" section with the dataset, the token rule (one shared ingest-only token, `AXIOM_GAMES_TOKEN`, rotation steps) and the dashboard uid placeholder. Verify: `python tools/axiom/dashboard.py` writes `dashboard.json`
- [x] 1.5 Release: kit check chain green, then `npm run release -- 0.2.0`. Verify: the GitHub Release v0.2.0 has the tarballs

## 2. Neljän suora on kit v0.2.0

- [x] 2.1 `npm run kit:use -- 0.2.0`; `server/src/index.ts` calls `setLogGame("neljan-suora")` first; `render.yaml` `AXIOM_DATASET` value `games`; remove `tools/axiom/dashboard.py`. Verify: restart the dev server (ports 2587/5193), the new lines in `logs/dev.log` have `"game":"neljan-suora"`, also a client line (open `/?dev=1v1`)
- [x] 2.2 Docs: `docs/operations.md` → Logs (Implemented; shared dataset `games`, ready queries with `where game == "neljan-suora"`, the shared dashboard and its uid from the kit README, token rule) and the setup checklist/config table (`AXIOM_TOKEN` = the shared ingest token for `games`); `openspec/context/nfr.md` (dataset `games`, field `game`). Verify: no `['neljan-suora']` query or per-game dataset left (`grep -rn "neljan-suora'\]" docs openspec/context`)
- [x] 2.3 Check chain, commit, push. Verify: `npm run lint && npm run typecheck && npm test && npm run build && npm run size -w @neljan-suora/client` green

## 3. Palikka on kit v0.2.0 (in `../palikka`, following its own instructions)

- [x] 3.1 `npm run kit:use -- 0.2.0`; `setLogGame("palikka")` first in its server entry; `render.yaml` `AXIOM_DATASET=games`; remove its `tools/axiom/dashboard.py`; its operations → Logs and nfr point to `games` with `where game == "palikka"`. Verify: its check chain green, its dev log lines have `"game":"palikka"`; commit and push per its rules
- [x] 3.2 Roadmap note (one line, "move logs to the shared `games` dataset with a `game` field, see game-kit README → Logs") in `../muuttuva-labyrintti` and `../monopoly-client` roadmaps or README if no roadmap. Verify: committed in each repo (push per their rules)

Notes (3): Palikka's dev-log check was covered by its check chain (same kit code) and the production
check 4.4. Monopoly's note went to its `docs/todo.md`, which is git-ignored there (a local file), so
no commit; Labyrinth's went to its roadmap's Improvement backlog and is pushed.

## 4. Axiom and Render (external; deletion approved by the user 2026-10-01)

- [x] 4.1 Delete the `palikka` dashboard and the `palikka` dataset with `tools/axiom/axiom.ps1`; create dataset `games` (30-day retention, EU). Verify: `GET /v2/datasets` lists `labyrinth`, `monopoly` and `games`
- [x] 4.2 Create one ingest-only token for `games`; store it (never printed) as `AXIOM_TOKEN` on the Render services `neljan-suora` (`srv-dav70tvpn0mc73afd0i0`) and `palikka` (Render MCP `update_environment_variables`) and as the user env var `AXIOM_GAMES_TOKEN`. Verify: both services redeploy and are live
- [x] 4.3 Upload the dashboard (`python ../game-kit/tools/axiom/dashboard.py`, then `axiom.ps1 POST /v2/dashboards`); record the uid in the kit README and in both games' operations → Logs. Verify: the dashboard opens and its Peli filter lists both games
- [x] 4.4 Production check: play or open each game once, then `['games'] | where _time > ago(1h) | summarize count() by game, src` (Axiom MCP) shows `neljan-suora` and `palikka` with `server` (and `client` where a client logged). Verify: the query result

## 5. Wrap-up

- [x] 5.1 Roadmap: `shared-logs` done; memory note `axiom-dataset-limit` updated (datasets now `labyrinth`, `monopoly`, `games`; shared token in `AXIOM_GAMES_TOKEN`). Commit and push docs (and kit README uid). Verify: working trees clean in all touched repos
