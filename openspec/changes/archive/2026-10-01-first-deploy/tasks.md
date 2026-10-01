# Tasks

## 1. Axiom

- [x] 1.1 Create dataset `neljan-suora` (EU region, 30-day retention) through `tools/axiom/axiom.ps1`; skip if it exists — **moved to `shared-logs`** (design decision 7)
- [x] 1.2 Create the ingest-only token "neljan-suora ingest (Render server)" for that dataset; keep it out of the terminal output (held for task 3.2) — **moved to `shared-logs`** (design decision 7)
- [x] 1.3 Build the dashboard with `tools/axiom/dashboard.py` (title "Neljän suora – lokit"), upload it, note its uid — **moved to `shared-logs`** (design decision 7)

## 2. GitHub Pages

- [x] 2.1 Enable Pages with source "GitHub Actions" (`gh api -X POST repos/Jukkakot/neljan-suora/pages -f build_type=workflow`)

## 3. Render (waits for the user)

- [x] 3.1 Ask the user to create the Blueprint from `render.yaml` in the shared workspace and to give the Deploy Hook URL; then read the service id and URL with the Render MCP
- [x] 3.2 Set `AXIOM_TOKEN` on the service with the Render MCP (`update_environment_variables`) — **moved to `shared-logs`** (design decision 7)
- [x] 3.3 `gh variable set VITE_SERVER_URL` (service URL) and `gh secret set RENDER_DEPLOY_HOOK_URL`
- [x] 3.4 Check `/health` answers with a version, and `ALLOWED_ORIGINS` matches the Pages origin

## 4. First deploy and verification

- [x] 4.1 Push to `main`; CI green incl. `deploy-server`, "Deploy client" green, site loads at https://jukkakot.github.io/neljan-suora/
- [x] 4.2 Run `gh workflow run prod-smoke.yml` and see it green (fix-forward any repo defect per design decision 6, recording the cause here) — ran automatically after the deploys (run 36878480411 green; the earlier run was cancelled by the concurrency group); no repo defect found
- [x] 4.3 Query Axiom for the smoke's lines (`server.*`, `game.started`, `ver` = pushed commit) — **moved to `shared-logs`** (design decision 7)
- [x] 4.4 UI check on the live site with `playwright-mobile` (portrait): start screen, a device game move, footer build times
- [x] 4.5 Refresh the front page card with `npm run homepage-card -- --push` (dev server running); it links the live game, no "Tulossa"

## 5. Docs and roadmap

- [x] 5.1 `docs/operations.md`: Environments → Implemented with the real server URL and Render service/workspace ids; setup checklist marked done with the date; Logs: dashboard uid and the setup line
- [x] 5.2 Any other wiki page that says "not deployed" / Planned for production (check `docs/README.md` map)
- [x] 5.3 `openspec/context/roadmap.md`: `first-deploy` → done
