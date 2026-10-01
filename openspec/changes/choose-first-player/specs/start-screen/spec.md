# Spec Delta

## ADDED Requirements

### Requirement: Who starts against the bot

While "Pelaan itse" is on, the start screen SHALL offer a choice of who starts the game against the
bot: "Minä", "Botti" or "Arvonta", one of them always selected. The choice SHALL be remembered on the
device for later visits; before the person has chosen, "Arvonta" SHALL be selected. The choice SHALL
NOT be shown for watching bots or for friends' games.

#### Scenario: First visit

- **WHEN** a person opens the start screen for the first time
- **THEN** "Arvonta" is selected

#### Scenario: Remembered

- **WHEN** the person selects "Minä", starts a game and later opens the app again
- **THEN** "Minä" is still selected

#### Scenario: Watching bots

- **WHEN** the person turns "Pelaan itse" off
- **THEN** the choice of who starts is not shown
