## REMOVED Requirements

### Requirement: Column first, one confirm
**Reason**: Two taps per move felt slow; the user chose a single tap (2026-10-01).
**Migration**: Replaced by "One tap drops" and "The hint shows a column"; the confirm button is gone.

## ADDED Requirements

### Requirement: One tap drops
On the viewer's turn each column that is not full SHALL be one tap target the full height of the
grid, and a tap on it SHALL play that column at once, in every game type. There SHALL be no
confirm step and no confirm button. A full column, every column while it is not the viewer's turn,
and every column while a move is on its way SHALL NOT be tappable, so a quick second tap cannot
play twice.

#### Scenario: Dropping a berry
- **WHEN** it is the viewer's turn and they tap column 4
- **THEN** the move "column 4" is sent

#### Scenario: A quick second tap
- **WHEN** the viewer taps column 4 and taps again before the move has landed
- **THEN** only one move is sent

#### Scenario: A full column
- **WHEN** column 1 holds six berries
- **THEN** column 1 cannot be tapped

### Requirement: The hint shows a column
"Vihje" SHALL light the suggested column and show the viewer's berry faded (the ghost) in the cell
it would land in, without playing it. A tap on any column SHALL then play that column. The ghost
SHALL be gone when the turn changes.

#### Scenario: Asking for a hint
- **WHEN** it is the viewer's turn and the hint suggests column 3, which holds two berries
- **THEN** their ghost berry shows in column 3's third hole from the bottom and no move is sent

#### Scenario: Following the hint
- **WHEN** the hint shows column 3 and the viewer taps column 3
- **THEN** the move "column 3" is sent

#### Scenario: Ignoring the hint
- **WHEN** the hint shows column 3 and the viewer taps column 5
- **THEN** the move "column 5" is sent
