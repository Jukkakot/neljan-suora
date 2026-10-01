# Proposal

## Why

The game is playable locally with a real bot, but nothing runs outside this machine: the setup
checklist in `docs/operations.md` stops after the GitHub repo. Players (and the games front page)
need a live address, and the release flow (CI → deploys → production smoke) only works once the
services exist.

## What Changes

- **GitHub Pages** enabled for the repo (source "GitHub Actions"); the "Deploy client" workflow
  publishes the client to https://jukkakot.github.io/neljan-suora/.
- **Render** free web service `neljan-suora-server` (Frankfurt) created from `render.yaml` as a
  Blueprint by the user; the deploy hook stored as the repo secret `RENDER_DEPLOY_HOOK_URL`, the
  service URL as the repo variable `VITE_SERVER_URL`. CI's `deploy-server` job then deploys it.
- **Axiom** dataset `neljan-suora` (EU), an ingest-only token in the Render service's
  `AXIOM_TOKEN`, and the people's dashboard built by `tools/axiom/dashboard.py` and uploaded.
- **Production smoke** run once by hand and green; from then on it runs after every deploy and
  daily.
- **Games front page** card refreshed so it links the live game instead of "Tulossa".
- **Docs**: `docs/operations.md` Environments and Logs turn from Planned to Implemented, with the
  URLs, Render ids, Axiom uid and the date; roadmap item 5 marked done.
- Code changes only if the first real deploy reveals a defect (e.g. CORS origin, build command,
  base path); none are expected.

No game behaviour changes, so this change has no spec deltas (`skip_specs`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Deployment is environment, not observable game behaviour.

## Impact

- Workspaces: none expected (server and client only if the first deploy shows a defect).
- External services created (user's go-ahead given): GitHub Pages site, Render web service
  (free), Axiom dataset and token (free tier), a card change pushed to `Jukkakot/Jukkakot.github.io`.
- Repository settings: variable `VITE_SERVER_URL`, secret `RENDER_DEPLOY_HOOK_URL`.
- Cost: 0 € (free tiers only).
- One manual step for the user: the Render Blueprint and copying its deploy hook.
