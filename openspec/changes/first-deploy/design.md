# Design

## Context

Everything the deploy needs is already in the repo from the template: `render.yaml`, the
workflows `ci.yml` (`deploy-server` job), `deploy-client.yml` and `prod-smoke.yml` (all skip with
a notice until `VITE_SERVER_URL` / `RENDER_DEPLOY_HOOK_URL` exist), `tools/axiom/*` and
`tools/homepage/card.mjs`. The repo `Jukkakot/neljan-suora` is public; Pages is not enabled
(API 404), no variables or secrets are set. Palikka went through the same checklist on
2026-09-29 and is the reference (its Render workspace `tea-d7vbs7l7vvec73dbddt0` is shared).

## Goals / Non-Goals

**Goals:**
- Live client and server, wired so that a push to `main` deploys both and the production smoke
  verifies them.
- Production logs in Axiom with a dashboard.
- The operations wiki records the real environment.

**Non-Goals:**
- Custom domain, staging environment, paid plans, error alerts or emails.
- Keeping the free server awake (sleep after ~15 min is accepted).
- Any game, UI or bot change.

## Decisions

1. **Render via Blueprint, by the user** (user's choice 2026-10-01). The user does dashboard →
   New → Blueprint → `Jukkakot/neljan-suora` in the shared workspace, then Settings → Deploy Hook
   and gives the hook to Claude (or runs `gh secret set` themselves). Keeps `render.yaml` the
   source of truth. Claude does every other step: the Render MCP reads the service id and URL and
   sets `AXIOM_TOKEN` (`update_environment_variables`), so the user never copies the Axiom token.
   This is the only point where implementation waits for the user.
2. **Order:** Axiom first (dataset + token, independent), then Pages enable, then wait for the
   user's Render step, then `AXIOM_TOKEN` on Render, `VITE_SERVER_URL`, `RENDER_DEPLOY_HOOK_URL`,
   then a push (the docs commit) triggers CI → server deploy and Deploy client. The first server
   deploy happens anyway when the Blueprint is created; the hook path is verified on the next push.
3. **Axiom token** is ingest-only for the `neljan-suora` dataset, named
   "neljan-suora ingest (Render server)", created through the REST API with `tools/axiom/axiom.ps1`
   (user's `AXIOM_PAT`). Never printed or committed; piped straight into the Render env var.
4. **Dashboard** title "Neljän suora – lokit", built by `dashboard.py`, uploaded with
   `axiom.ps1`; uid recorded in `docs/operations.md` → Logs.
5. **Front page card**: `npm run homepage-card -- --push` with the dev server running, after the
   Pages site answers, so the card switches from "Tulossa" to the live link (standing push
   permission for that repo).
6. **Fix-forward:** if the first deploy fails on something in the repo (CORS origin, base path,
   build command, Node version), fix it in this change with a `fix:` commit; record the cause in
   `tasks.md`. If a fix is generic (template file), note it as a kit TODO for `game-kit/template/`.

## NFR (openspec/context/nfr.md)

- **Logging:** this change switches on the production side of the existing logging: lines reach
  Axiom with `ver` = short commit; verified by querying the dataset for `server.*` and
  `game.started` lines after the smoke.
- **Tests:** no new code tests. Acceptance is operational: Pages deploy green, CI `deploy-server`
  green, `prod-smoke` green (it plays against a bot on the device and starts a server game with a
  bot on the live site), `/health` shows the pushed commit.
- **Limits / abuse:** unchanged; `ALLOWED_ORIGINS` = `https://jukkakot.github.io` is checked
  against the real Pages origin.
- **Budget:** free tiers only, 0 €.

## Risks / Trade-offs

- Free Render server sleeps → first visit waits ~1 min; the smoke's 15-min wait covers cold start.
- A secret could leak into logs or the terminal → tokens are passed through variables/stdin only,
  never echoed.
- The user's Render step blocks the autopilot → it is the last external step before wiring, and
  everything else is done first so the wait is short.
