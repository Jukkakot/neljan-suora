# observability Specification

## Purpose
Where the game's production logs go and how each line says which game and which side (server or
client) wrote it, so that several games can share one central log store.

## Requirements

### Requirement: Every log line names its game and side

Every log line the server writes, its own and those it writes for a client, SHALL carry the field
`game` with the game's kebab name (`neljan-suora`) and the field `src` with `server` or `client`.
The game name SHALL be fixed in the game's code, not in deployment settings. A server started
without a game name SHALL write `game` as `unknown` rather than leave the field out.

#### Scenario: Server line names the game

- **WHEN** the server logs any event (e.g. `server.started`)
- **THEN** the line has `game` = `neljan-suora` and `src` = `server`

#### Scenario: Client line names the game

- **WHEN** a client sends a log entry (e.g. `client.error`) and the server writes it
- **THEN** the line has `game` = `neljan-suora` and `src` = `client`, with the client's version and timestamp

#### Scenario: Game name missing

- **WHEN** a server built on the kit starts without a game name and logs an event
- **THEN** the line has `game` = `unknown`

### Requirement: Production logs go to the shared store

In production, when the ingest token and the dataset are configured, every log line SHALL also be
shipped to the central log store's dataset shared by the user's games (`games`), and it SHALL still
be written to stdout. Without the token or outside production, nothing SHALL be shipped. A failing
store SHALL only lose lines, never slow or stop a game.

#### Scenario: Production with the store configured

- **WHEN** the production server runs with the token and the dataset `games` set and logs a line
- **THEN** the line appears on stdout and in the `games` dataset with its `game`, `src` and a timestamp

#### Scenario: Lines of one game can be picked out

- **WHEN** someone queries the `games` dataset for `game == "neljan-suora"`
- **THEN** only Neljän suora's lines, server and client, are returned

#### Scenario: Not configured or not production

- **WHEN** the token is missing, or the server runs in development or tests
- **THEN** nothing is shipped and the lines go to stdout (and in development to the local log file) as before
