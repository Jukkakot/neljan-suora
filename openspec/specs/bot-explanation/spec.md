# bot-explanation Specification

## Purpose
How the game tells a person how each bot move and hint was worked out (from the opening book,
solved to the end, or an estimate) and, when certain, the outcome under perfect play.

## Requirements

### Requirement: The bot tells how it chose

After a bot's move worked out on this device, the status line SHALL say how the move was worked out,
until the next move: **from the book** (the opening book), **solved** (searched to the end of the
game) or **an estimate** (it could not finish in time and chose by the heuristic). When the move came
from the book or a solve, it SHALL also say the outcome under perfect play from then on: which named
player wins, or a draw. An estimate SHALL NOT claim an outcome. Moves worked out on another device
(a bot run by another player's browser in an online game) show no explanation. A notice or a shown
hint takes the place of the explanation while it is on screen.

#### Scenario: A move from the book

- **WHEN** the bot "Kettu" opens a device game from the book
- **THEN** the status line says the move came from the book and that Kettu wins

#### Scenario: An estimate

- **WHEN** the bot cannot settle the position within its budget and plays the heuristic's column
- **THEN** the status line says the move was an estimate and names no winner

#### Scenario: Watching bots

- **WHEN** a person watches two bots play on the device
- **THEN** after every move the status line explains that bot's move

### Requirement: The hint tells how it was worked out

A shown hint SHALL say, next to its column, how the column was worked out in the same three levels,
and, when certain, the outcome for the person asking ("you win", a draw, or "you lose").

#### Scenario: Hint from the book

- **WHEN** a person asks for a hint early in a game and the server's book holds the position
- **THEN** the hint names the column, says it came from the book and states the outcome for them
