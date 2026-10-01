# Spec Delta

## MODIFIED Requirements

### Requirement: The grid and who starts
A game SHALL be played by two seats on an upright grid of 7 columns and 6 rows that starts empty.
When the game's options name a first seat, that seat SHALL have the first turn; otherwise the
game's seed SHALL draw which seat has the first turn, and the same seed SHALL give the same
starter. The seats SHALL then take turns.

#### Scenario: A new game
- **WHEN** a game starts with seats 1 and 2
- **THEN** all 42 cells are empty and one of the seats, drawn from the seed, is on turn

#### Scenario: A chosen first seat
- **WHEN** a game starts with seats 1 and 2 and options naming seat 2 as the first seat
- **THEN** seat 2 is on turn, whatever the seed

#### Scenario: Turns alternate
- **WHEN** the seat on turn makes a legal move
- **THEN** the other seat is on turn
