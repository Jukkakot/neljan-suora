## ADDED Requirements

### Requirement: The grid and who starts
A game SHALL be played by two seats on an upright grid of 7 columns and 6 rows that starts empty.
The game's seed SHALL draw which seat has the first turn; the same seed SHALL give the same
starter. The seats SHALL then take turns.

#### Scenario: A new game
- **WHEN** a game starts with seats 1 and 2
- **THEN** all 42 cells are empty and one of the seats, drawn from the seed, is on turn

#### Scenario: Turns alternate
- **WHEN** the seat on turn makes a legal move
- **THEN** the other seat is on turn

### Requirement: A move drops into a column
A move SHALL name a column. The seat's disc SHALL land in the lowest empty cell of that column.
A column that is full SHALL be refused with `COLUMN_FULL`; a column outside the grid or not a whole
number SHALL be refused as a malformed move. A move by a seat not on turn, by someone not seated,
or after the end SHALL be refused. A refused move SHALL change nothing.

#### Scenario: The disc falls to the bottom
- **WHEN** the seat on turn plays an empty column
- **THEN** its disc is in that column's bottom cell

#### Scenario: Stacking
- **WHEN** a column already holds two discs and a seat plays it
- **THEN** the new disc lands on top of them, in the third cell from the bottom

#### Scenario: A full column
- **WHEN** a seat plays a column that holds six discs
- **THEN** the move is refused with `COLUMN_FULL` and the game is unchanged

#### Scenario: Off the grid
- **WHEN** a seat plays column 7 or column -1
- **THEN** the move is refused as malformed and the game is unchanged

### Requirement: Four in a row wins
A seat that gets four or more of its discs in a line across, up, or along either diagonal SHALL win
at once and the game SHALL end. The game SHALL keep the cells of every such line the winning disc
completed, so they can be shown.

#### Scenario: Four across
- **WHEN** a seat's fourth disc completes a horizontal line of four
- **THEN** the seat wins, nobody is on turn, and the four cells are the winning line

#### Scenario: Four up
- **WHEN** a seat's fourth disc completes a vertical line of four
- **THEN** the seat wins and the four cells are the winning line

#### Scenario: Four along a diagonal
- **WHEN** a seat's disc completes a diagonal line of four, rising or falling
- **THEN** the seat wins and the four cells are the winning line

#### Scenario: Two lines at once
- **WHEN** a seat's disc completes a horizontal and a vertical line of four at the same time
- **THEN** the winning line holds the cells of both

### Requirement: A full grid is a draw
When the 42nd disc fills the grid without completing four in a row, the game SHALL end with no
winner.

#### Scenario: Draw
- **WHEN** the last empty cell is filled and no line of four exists
- **THEN** the game is over, nobody wins and no cells are the winning line
