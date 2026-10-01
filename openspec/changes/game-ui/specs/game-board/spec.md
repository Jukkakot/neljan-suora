## ADDED Requirements

### Requirement: Column first, one confirm
On the viewer's turn each column that is not full SHALL be one tap target the full height of the
grid. The first tap SHALL choose the column: the viewer's berry is shown faded (the ghost) in the
cell it would land in and the column is lit. A second tap on the same column, or "Aseta", SHALL drop
it; a tap on another column SHALL move the choice there. Nothing SHALL be played by a single tap.
A full column, every column while it is not the viewer's turn, and every column while a move is on
its way SHALL NOT be tappable.

#### Scenario: Choosing a column
- **WHEN** it is the viewer's turn and they tap column 4, which holds two berries
- **THEN** their ghost berry shows in column 4's third hole from the bottom and no move is sent

#### Scenario: Confirming
- **WHEN** the viewer has chosen column 4 and taps it again
- **THEN** the move "column 4" is sent

#### Scenario: Changing the choice
- **WHEN** the viewer has chosen column 4 and taps column 2
- **THEN** the ghost moves to column 2 and no move is sent

#### Scenario: A full column
- **WHEN** column 1 holds six berries
- **THEN** column 1 cannot be tapped

### Requirement: Columns read aloud
Each column SHALL be labelled with its number and its contents from the bottom up (or that it is
empty), and SHALL say when it is full or chosen.

#### Scenario: A column with berries
- **WHEN** column 3 holds a lingonberry with a blueberry on top
- **THEN** its label reads "Sarake 3: puolukka, mustikka"

### Requirement: The winning row stands out
When a game is won, the berries outside the winning line SHALL fade, so the line's berries (with
their ring) stand out. A draw SHALL fade nothing.

#### Scenario: A win
- **WHEN** a game ends with four lingonberries in a row
- **THEN** the four berries are at full strength with the ring and the other berries are faded

#### Scenario: A draw
- **WHEN** a game ends in a draw
- **THEN** no berry is faded
