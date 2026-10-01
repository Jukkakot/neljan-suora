# Spec Delta

## Purpose

How the bot offered to players chooses its moves: always legal and within its thinking budget,
tactically sound (wins, blocks, no gifts), reproducible, and measurably stronger than the kit's
generic search.

## ADDED Requirements

### Requirement: A legal move within the budget

Whenever the seat it plays is on turn in a game that is not over, the bot SHALL answer with a legal
column (one that is not full). Given a time budget it SHALL answer within that budget plus a small
margin (at most 50 ms over, measured on the machine running it); given a depth budget it SHALL search
to that depth however long it takes; given both, whichever runs out first. When the game is over it
SHALL answer with no move.

#### Scenario: Only one column open

- **WHEN** six columns are full and the bot is on turn
- **THEN** it answers with the one open column

#### Scenario: Time budget

- **WHEN** the bot is on turn in the opening with a budget of 200 ms
- **THEN** it answers with a legal column within 250 ms

#### Scenario: Game over

- **WHEN** the bot is asked for a move in a finished game
- **THEN** it answers with no move

### Requirement: Tactics the bot never misses

With any budget, the bot SHALL:

- drop into a column that wins at once when there is one;
- otherwise block the other seat's immediate win when there is exactly one such column;
- not drop into a column whose disc would let the other seat win at once by dropping on top of it,
  unless every open column does so or it must block there.

Columns are numbered 0–6 from the left; a move sequence lists the columns played in turn, the first
seat starting.

#### Scenario: Takes the win on an edge

- **WHEN** the first seat holds three in column 0 (sequence 0, 1, 0, 1, 0, 2) and is on turn
- **THEN** the bot playing it drops into column 0

#### Scenario: Blocks an edge threat

- **WHEN** the first seat holds three across columns 4, 5 and 6 in the bottom row with column 3's
  bottom cell open (sequence 4, 0, 5, 0, 6) and the second seat is on turn
- **THEN** the bot playing the second seat drops into column 3

#### Scenario: No gift under a threat

- **WHEN** the other seat would win by a disc in column 2's second cell and column 2 is empty, and
  another column neither wins nor loses at once
- **THEN** the bot does not drop into column 2

### Requirement: Sees forced wins

When the bot has a win it can force within the depth it searches (for example a double threat: two
columns that each win at once next turn), it SHALL play a move of that forced win, and among forced
wins it SHALL prefer the shortest. When every move loses by force, it SHALL prefer the one that loses
latest.

#### Scenario: Double threat

- **WHEN** the bot can make an open three in the bottom row whose both ends are open and playable,
  and the other seat has no immediate win
- **THEN** it plays that move, with a depth budget of 4 or more

### Requirement: Reproducible play

Given the same position, depth budget and seed, the bot SHALL choose the same column. Among root
moves it rates exactly equal it SHALL choose by the seed, so different seeds may vary the play.

#### Scenario: Same seed, same move

- **WHEN** the bot is asked twice for the same position with a depth budget of 6 and seed 7
- **THEN** it answers the same column both times

### Requirement: Measured strength

The bot's strength SHALL be checked by the tournament workflow against fixed requirements, each a
score share of the candidate over a fixed number of games where each seed is played once with each
seat order and every game starts from a short random opening drawn from its seed:

- against a uniformly random player: a share of at least 0.98;
- against the kit's best-reply search at depth 4, the bot at depth 8: a share of at least 0.9;
- against the kit's best-reply search with the same time limit of 100 ms per move: a share of at
  least 0.8.

A missed requirement SHALL fail the tournament workflow.

#### Scenario: All requirements met

- **WHEN** the strength check runs on the main branch
- **THEN** every requirement passes and the workflow is green

### Requirement: The offered bot

The bot offered on the device and computed by the online bot runner SHALL be this bot, thinking for
about 800 ms per move at normal speed (less at a faster watching speed).

#### Scenario: Bot game on the device

- **WHEN** a person plays against a bot on the device and leaves an open three in the bottom row
  with one end open
- **THEN** the bot blocks it on its next move
