# game-room Specification

## Purpose
An online game on the server: seats and the start, turns and the time limit, moves and their
refusal, leaving and kicking, the end and the result, and what every client sees. The rules
themselves are in game-rules.

## Requirements

### Requirement: Seats and the start

A game SHALL have two seats. People take the lowest free seat in the waiting room, the first person
hosts, and the host may seat bots in free seats. The host SHALL be able to start the game once both
seats are taken (people and bots together). The game's seed SHALL draw who has the first turn.

#### Scenario: Two seated

- **WHEN** a person in seat 1 and a bot in seat 2 are seated and the host starts
- **THEN** the game runs with both seats and one of them is on turn

#### Scenario: Host alone

- **WHEN** the host is the only one seated and tries to start
- **THEN** the start is refused with `NOT_ENOUGH_PLAYERS`

### Requirement: A move

The seated player on turn SHALL make a move: a column. The server SHALL check the move with the
rules and accept it only when it is legal; an accepted move SHALL be seen by every client. A refused
move SHALL change nothing and SHALL be answered with the reason: `NOT_SEATED` (not a player of this
game), `WRONG_PHASE` (the game is not running), `NOT_YOUR_TURN`, `AUTOPLAYING` (the bot plays this
seat now), `INVALID_COMMAND` (a malformed move, such as a column off the grid), or `COLUMN_FULL`
(the column has no empty cell). Every client SHALL see which player is on turn.

#### Scenario: Legal move

- **WHEN** the player on turn plays a column that is not full
- **THEN** the move is accepted, every client sees the disc in that column's lowest empty cell, and
  the other player is on turn

#### Scenario: Refused by the rules

- **WHEN** the player on turn plays a full column
- **THEN** the move is refused with `COLUMN_FULL` and the board is unchanged

#### Scenario: Not your turn

- **WHEN** a player sends a move while the other is on turn
- **THEN** the move is refused with `NOT_YOUR_TURN`

### Requirement: Turn time limit

Each turn SHALL have a time limit of 120 seconds, shown to every client as the time left. Once it
has run out, any other seated player SHALL be able to remove the player on turn; the player on turn
may still move until then.

#### Scenario: Time up

- **WHEN** the player on turn has not moved within 120 seconds
- **THEN** the other seated players may remove them

#### Scenario: Too early

- **WHEN** another player tries to remove the player on turn before the time is up
- **THEN** the removal is refused with `TURN_NOT_EXPIRED`

### Requirement: Leaving a running game

A player who leaves, is removed after the time limit, or stays disconnected past the seat hold SHALL
leave the game; what happens to their part of the game follows the rules. When one seated player is
left, they SHALL win at once. When nobody is left (no person seated and nobody watching), the game
SHALL end with no winner.

#### Scenario: The opponent leaves

- **WHEN** in a two-player game one player leaves
- **THEN** the game ends and the other player wins

### Requirement: End and result

The game SHALL end when a player gets four in a row or the grid is full. Every client SHALL then see
the result: the winning player, or that nobody won, the winning line's cells, and each player's line
in the result table; a player who left the game SHALL NOT be among the winners. The players SHALL be
able to play again ("Pelaa uudelleen") or go back to the start.

#### Scenario: A win

- **WHEN** a player completes four in a row
- **THEN** every client sees that player as the winner, the winning line's cells and the result
  table

#### Scenario: Nobody wins

- **WHEN** the grid fills without four in a row
- **THEN** every client sees a draw
