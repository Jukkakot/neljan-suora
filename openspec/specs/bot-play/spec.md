# bot-play Specification

## Purpose
How the bot offered to players chooses its moves: always legal and within its thinking budget,
tactically sound (wins, blocks, no gifts), reproducible, and measurably stronger than the kit's
generic search.

## Requirements

### Requirement: A legal move within the budget

Whenever the seat it plays is on turn in a game that is not over, the bot SHALL answer with a legal
column (one that is not full). A budget may limit time, the heuristic search's depth and the size of
the solve (a node count); limits that are not given do not limit. Given a time budget it SHALL answer
within that budget plus a small margin (at most 50 ms over, measured on the machine running it),
spending it on the solve first and the heuristic search after; given only depth and solve limits it
SHALL use them however long they take; given several, whichever runs out first ends that part. When
the game is over it SHALL answer with no move.

#### Scenario: Only one column open

- **WHEN** six columns are full and the bot is on turn
- **THEN** it answers with the one open column

#### Scenario: Time budget

- **WHEN** the bot is on turn in the opening with a budget of 200 ms
- **THEN** it answers with a legal column within 250 ms

#### Scenario: Unsolved position within the time budget

- **WHEN** the bot is on turn without its book in a position it cannot solve in 3 s, with a budget
  of 3 s
- **THEN** it answers with a legal column within 3.05 s

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

Given the same position, the same depth and solve limits and the same seed (and the same book), the
bot SHALL choose the same column. Among columns it rates exactly equal (the book's best columns
included) it SHALL choose by the seed, so different seeds may vary the play.

#### Scenario: Same seed, same move

- **WHEN** the bot is asked twice for the same position with a depth budget of 6 and seed 7
- **THEN** it answers the same column both times

#### Scenario: Same seed, same book move

- **WHEN** the bot is asked twice for the same position in its book with seed 7
- **THEN** it answers the same column both times, one of the book's best columns

### Requirement: Measured strength

The bot's strength SHALL be checked by the tournament workflow against fixed requirements, each a
score share of the candidate over a fixed number of games where each seed is played once with each
seat order and every game starts from a short random opening drawn from its seed. Requirements use
depth and solve limits only, so their result does not depend on the machine:

- the heuristic search against a uniformly random player: a share of at least 0.98;
- the heuristic search at depth 8 against the kit's best-reply search at depth 4: a share of at
  least 0.9;
- the offered (perfect) bot against the heuristic search at depth 8: a share of at least 0.8;
- the offered bot never loses a game whose position after the random opening it can settle as a
  win or a draw for itself (it may lose only games it starts lost).

A missed requirement SHALL fail the tournament workflow. The solver's verdicts SHALL also be checked
in the unit tests against exact full-depth search on late positions.

#### Scenario: All requirements met

- **WHEN** the strength check runs on the main branch
- **THEN** every requirement passes and the workflow is green

#### Scenario: Solver agrees with exact search

- **WHEN** the unit tests solve random positions with at least 28 discs
- **THEN** each verdict (win, draw, loss) matches the sign of the exact full-depth search's score

### Requirement: The offered bot

The bot offered on the device, computed by the online bot runner and asked by "Vihje" SHALL be the
perfect bot (best outcome, opening book, heuristic fallback), thinking for at most about 3 s per move
at normal speed (divided by the watching speed). A move it settles quickly SHALL still come after the
usual visible pause; only a position it cannot settle quickly lengthens the pause, while the turn line
says the bot is thinking.

#### Scenario: Bot game on the device

- **WHEN** a person plays against a bot on the device and leaves an open three in the bottom row
  with one end open
- **THEN** the bot blocks it on its next move

#### Scenario: Bot opens a device game

- **WHEN** a person starts a device game in which the bot plays the first seat
- **THEN** the bot drops into column 3 after the usual pause

### Requirement: Keeps the best outcome

The outcome of a position is what the side to move gets under perfect play from both sides: a win,
a draw or a loss. Whenever the bot can settle the position within its budget (from its opening book
or by solving it), it SHALL drop into a column whose outcome is the best one available to it (a win
before a draw, a draw before a loss). Among the columns of that outcome it SHALL choose as the
heuristic search does (so the tactics and the forced-win preferences below still hold).

#### Scenario: Opens in the centre

- **WHEN** the bot plays the first seat and the board is empty
- **THEN** it drops into column 3, the only winning first move

#### Scenario: Punishes an edge opening

- **WHEN** the person plays the first seat and opens in column 0, and the bot plays the second seat
- **THEN** the bot drops into a column after which the second seat still wins under perfect play

#### Scenario: Never throws away a won game

- **WHEN** the bot is on turn in a position the side to move wins, and it can solve the position
  within its budget
- **THEN** after its move the position is still won for the bot under perfect play

#### Scenario: Holds a draw

- **WHEN** the bot is on turn in a drawn position (no win for the side to move, no loss forced), and
  it can solve the position within its budget
- **THEN** after its move the position is drawn or better for the bot under perfect play

### Requirement: Falls back when it cannot settle a position

When the bot cannot settle the position within its budget (not in the book and the solve does not
finish), it SHALL answer with the heuristic search's move, still within the budget's limits. A
position it cannot settle SHALL never make it answer late or not at all.

#### Scenario: Solve limit runs out

- **WHEN** the bot is asked in a position outside its book with a solve limit too small to settle it
- **THEN** it answers with the column the heuristic search chooses within the same budget

### Requirement: The opening book is loaded on demand

The bot's opening book SHALL NOT be part of the app's first load. It SHALL be fetched the first time a
bot move (or a hint) is needed in the app, kept for the rest of the visit, and stored so that it is
available offline after one successful fetch. Until it has arrived, or when it cannot be fetched,
the bot SHALL still answer within its budget, solving the position itself or falling back to the
heuristic move. A failed fetch SHALL be logged once and retried at the next visit, not in a loop.

#### Scenario: First bot move of the visit

- **WHEN** a person starts their first game against a bot after opening the app
- **THEN** the book is fetched then, and not when the start screen loads

#### Scenario: Offline after a visit

- **WHEN** the book was fetched in an earlier visit and the device is offline
- **THEN** the bot plays from the book without the network

#### Scenario: Book unavailable

- **WHEN** the book cannot be fetched
- **THEN** the bot still answers every move within its budget, and one warning is logged
