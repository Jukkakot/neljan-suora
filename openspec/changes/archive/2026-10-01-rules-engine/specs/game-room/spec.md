## MODIFIED Requirements

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
