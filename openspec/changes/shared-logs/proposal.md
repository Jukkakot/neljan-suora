# Proposal: shared-logs

## Why

Production logs should reach Axiom, but the personal tier allows only 3 datasets and
`labyrinth`, `monopoly` and `palikka` take them all, so Neljän suora ships nothing and its logs
are read from Render only. One dataset shared by the kit's games removes the limit for every
future game too: each line says which game wrote it, and queries and the dashboard filter by that.

## What Changes

- **Game kit** (`../game-kit`, released as a new minor version):
  - Every log line, server and client, carries the field `game` (the game's kebab name), set in the
    server's code at startup; `src` (`server`/`client`) already exists.
  - The template sets the game name (filled in by `create-game`), points `AXIOM_DATASET` at the
    shared dataset `games`, and drops the per-game dashboard script.
  - One shared Axiom dashboard "Pelit – lokit" with a game filter, built by a script in the kit's
    `tools/axiom/` (one place to maintain).
- **Axiom** (external, approved by the user 2026-10-01): delete the `palikka` dataset and its
  dashboard (its ≤30 days of logs are lost), create the dataset `games` and one ingest-only token
  for it, shared by the games that ship there.
- **Palikka** (`../palikka`): move to the new kit release, set its game name, ship to `games`.
- **Neljän suora**: move to the new kit release, set its game name, set `AXIOM_TOKEN` on Render,
  ship to `games`; docs (operations → Logs, nfr) and the ready queries use `['games'] | where game == "neljan-suora"`;
  the local dashboard script goes; a production check that lines arrive.
- Not in scope: `muuttuva-labyrintti` and `monopoly` keep their own datasets (a roadmap note in
  their repos suggests moving later).

Workspaces touched here: **server** (startup sets the game name; kit version), plus docs and
tools. `rules` and `client` do not change (client lines get `game` on the server).

## Capabilities

### New Capabilities

- `observability`: where production logs go and how a line identifies its game and side, so that
  lines from several games can share one store.

### Modified Capabilities

(none)

## Impact

- `@game-kit/server` logger: one new field on every line; new kit release (`npm run kit:use`).
- `render.yaml` (`AXIOM_DATASET=games`), Render env of `neljan-suora` and `palikka` (token).
- Axiom: dataset and dashboard deleted (irreversible, approved), dataset, token and dashboard created.
- `tools/axiom/dashboard.py` removed here and in the template; `tools/axiom/axiom.ps1` stays.
- Memory note `axiom-dataset-limit` updated when done.
