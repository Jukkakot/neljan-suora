# Design: shared-logs

## Context

See proposal.md → Why. Today the kit's logger (`@game-kit/server`, `logging/logger.ts`) writes one
JSON line per event to stdout and, in production with `AXIOM_TOKEN` + `AXIOM_DATASET`, ships it
through `@axiomhq/pino`. Lines already carry `src` (`server`/`client`) and `ver`; client entries
are written by the server (`log.client`), so the server sees every line. The logger is built at
module load (`createPino({})`); `configureLogger` rebuilds it (tests). Palikka is on kit v0.1.0;
Neljän suora too. Axiom org "Jukka projects", EU edge `eu-central-1.aws.edge.axiom.co`, admin
calls through `tools/axiom/axiom.ps1` (user's `AXIOM_PAT`, `AXIOM_ORG_ID`).

## Goals / Non-Goals

**Goals:** one dataset `games` for all kit games; every line says `game` and `src`; one dashboard
with a game filter; Neljän suora and Palikka ship there; a new game gets it from the template with
no extra setup beyond the token.

**Non-Goals:** moving `muuttuva-labyrintti` or `monopoly` (they keep their datasets; a roadmap note
in each repo); changing the line format otherwise; per-game access control inside the dataset;
client-side shipping (clients still log through the server).

## Decisions

1. **`game` set in code with `setLogGame(name)`** (user's choice: code, not env). A new kit export
   only stores the name in the logger state; it does not rebuild pino. Rebuilding with
   `configureLogger` would start a second Axiom transport worker in production, since the first is
   created at import. Each game calls it as the first statement in `server/src/index.ts`
   (`setLogGame("neljan-suora")`); the template has `setLogGame("starter-game")`, so `create-game`
   fills in the name through its usual placeholder replacement. Until it is called, `game` is
   `unknown` (the spec: never missing). Alternative rejected: `LOG_GAME` env var (one more setting
   to forget per service).
2. **Key order** `level, evt, room, player, …fields, game, src, ver[, time]`. `game` sits with the
   other "where from" fields at the end; `level` and `evt` stay first, so existing tests and
   habits hold. The development pretty printer hides `game` like `src,ver` (noise locally).
3. **Dataset `games`, one shared ingest-only token** (user's choice: one token). The token is
   scoped to ingest into `games` only. It lives as a secret (`sync: false`) in each Render service's
   `AXIOM_TOKEN`, and in the user's Windows environment as `AXIOM_GAMES_TOKEN`, so a new game's
   setup can reuse it without creating another. It is never printed, committed or written to
   docs. `render.yaml` sets `AXIOM_DATASET=games` (template too). Trade-off accepted: a leak lets
   someone write to all games' logs; mitigation is rotating the one token (steps in operations).
4. **Free the slot by deleting `palikka`** (user's choice, approved 2026-10-01 as the one
   irreversible external step of this change). Its ≤30 days of lines and its dashboard are lost;
   Palikka moves to `games` in the same change. End state: `labyrinth`, `monopoly`, `games`.
   Create `games` with 30-day retention like the others.
5. **One dashboard "Pelit – lokit", maintained in the kit** (user's choice). The script moves
   from the template to the kit root: `../game-kit/tools/axiom/dashboard.py` (+ `axiom.ps1` there
   too). It is the current template script with `DS = "games"`, a **Peli** filter (select list
   from `distinct game`, default all), `game` added to the log table, and the stat tiles split by
   game where it reads well (e.g. games started by `game`). Its uid is recorded in the kit README
   and in each game's operations → Logs. The template and this repo drop their `dashboard.py`;
   `axiom.ps1` stays in games for ad-hoc admin calls.
6. **Kit release v0.2.0** (minor: new export, new field). Games switch with `npm run kit:use -- 0.2.0`.
7. **Labyrinth / monopoly**: only a roadmap line in their repos ("move logs to the shared `games`
   dataset with a `game` field"), committed per those repos' rules. No code there.

### How it meets nfr.md

- Logging: the format stays (one JSON line, fixed `evt` catalogue, `src`, `ver`, `time` when
  shipped); one field added. Privacy unchanged: no IP, nickname only; `game` is not personal.
  Stdout stays as the fallback; shipping stays off the event loop.
- Tests: kit logger unit tests cover the new field on server and client lines, the `unknown`
  default and the key order; no new game-side unit test (one line in `index.ts`), checked through
  the local dev log and the production query.
- Limits/cost: one dataset fewer in total use, budget 0 €.

## Risks / Trade-offs

- [Gap in Palikka's logs between deleting `palikka` and its deploy on `games`] → do the Axiom steps
  only after both games' code is pushed and ready; set the Render env right after creating the
  token; lines in the gap are only lost, games keep running (Render keeps stdout).
- [Shared token leak] → ingest-only, single dataset; rotation documented.
- [A game forgets `setLogGame`] → lines show `game == "unknown"`; the dashboard shows it as its own
  value, and the template already has the call.
- [Axiom's dashboard API rejects the new filter shape] → fall back to a free-text search filter
  for game (same as the room filter), which is known to work.

## Migration Plan

1. Kit: field + `setLogGame`, template, dashboard script → release v0.2.0.
2. Neljän suora and Palikka: `kit:use 0.2.0`, `setLogGame`, `AXIOM_DATASET=games`, docs → push.
3. Axiom: delete `palikka` dashboard and dataset → create `games` → create the ingest token →
   store it in Render (`neljan-suora`, `palikka` services) and `AXIOM_GAMES_TOKEN` → upload the
   dashboard.
4. Check: after the deploys, `['games'] | where evt == "server.started" | summarize count() by game`
   shows both games.

Rollback: unset `AXIOM_TOKEN` on a service (nothing shipped, Render logs remain); the old `palikka`
dataset cannot be restored, which the user accepted.
