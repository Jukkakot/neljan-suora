## REMOVED Requirements

### Requirement: Restrained voice
**Reason**: It named the move's confirm button "Aseta", which no longer exists (one tap drops).
**Migration**: Replaced by "Plain voice", the same rule without the confirm button.

## ADDED Requirements

### Requirement: Plain voice
Texts in play SHALL be plain and clear; the piece SHALL be called a berry ("marja", "berry").
Theme words SHALL appear only in names and in the end-of-game lines: "Voitit – kori täynnä!"
("You won – basket full!"), "{name} voitti – kori täynnä" ("{name} won – basket full") and
"Tasapeli – laatikko täynnä" ("Draw – the crate is full").

#### Scenario: The viewer wins
- **WHEN** the viewer wins a game
- **THEN** the end of the game reads "Voitit – kori täynnä!" in Finnish

#### Scenario: Another player wins
- **WHEN** the bot Kettu wins a game the viewer played
- **THEN** the end of the game reads "Kettu voitti – kori täynnä"
