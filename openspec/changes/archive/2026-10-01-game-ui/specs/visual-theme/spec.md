## MODIFIED Requirements

### Requirement: Motion of a placed piece
A newly placed berry SHALL drop from the top of its column to its cell, faster the shorter the fall
and speeding up as it falls, then settle with a short squish (it lands flattened and springs back);
the whole motion SHALL end within 500 ms. The last move SHALL stay marked until the next move. When
the device asks for reduced motion, the berry SHALL appear at rest at once and the mark SHALL remain.

#### Scenario: A move settles in
- **WHEN** a move is made
- **THEN** the new berry drops down its column, squishes, is at rest within 500 ms, and is marked
  as the last move

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion and a move is made
- **THEN** the berry appears at rest without animation and is marked as the last move
