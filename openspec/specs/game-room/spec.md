# game-room Specification

## Purpose
An online game on the server: seats and the start, turns and the time limit, moves and their
refusal, leaving and kicking, the end and the result, and what every client sees. The rules
themselves come from the game; the placeholder game's (Ristinolla) are marked as such.

## Requirements

### Requirement: Seats and the start

A game SHALL have the seats the game's rules allow (placeholder: 2). People take the lowest free
seat in the waiting room, the first person hosts, and the host may seat bots in free seats. The host
SHALL be able to start the game once the rules' least number of seats is taken (people and bots
together). Who has the first turn SHALL follow the rules (placeholder: the game's seed draws it).

#### Scenario: Two seated

- **WHEN** a person in seat 1 and a bot in seat 2 are seated and the host starts
- **THEN** the game runs with both seats and one of them is on turn

#### Scenario: Host alone

- **WHEN** the host is the only one seated and tries to start
- **THEN** the start is refused with `NOT_ENOUGH_PLAYERS`

### Requirement: A move

The seated player on turn SHALL make a move. The server SHALL check the move with the rules and
accept it only when it is legal; an accepted move SHALL be seen by every client. A refused move
SHALL change nothing and SHALL be answered with the reason: `NOT_SEATED` (not a player of this
game), `WRONG_PHASE` (the game is not running), `NOT_YOUR_TURN`, `AUTOPLAYING` (the bot plays this
seat now), `INVALID_COMMAND` (a malformed move), or the rules' own refusal (placeholder:
`CELL_TAKEN`). Every client SHALL see which player is on turn.

#### Scenario: Legal move

- **WHEN** the player on turn marks an empty cell (placeholder)
- **THEN** the move is accepted, every client sees the mark, and the other player is on turn

#### Scenario: Refused by the rules

- **WHEN** the player on turn marks a cell that is already taken (placeholder)
- **THEN** the move is refused with `CELL_TAKEN` and the board is unchanged

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

The game SHALL end when the rules say so (placeholder: three in a row, or a full board). Every
client SHALL then see the result: the winning player or players, or that nobody won, and each
player's line in the result table; a player who left the game SHALL NOT be among the winners. The
players SHALL be able to play again ("Pelaa uudelleen") or go back to the start.

#### Scenario: A win

- **WHEN** a player completes three in a row (placeholder)
- **THEN** every client sees that player as the winner and the result table

#### Scenario: Nobody wins

- **WHEN** the game ends without a winner (placeholder: a full board)
- **THEN** every client sees a draw
