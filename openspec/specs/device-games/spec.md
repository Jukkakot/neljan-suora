# device-games Specification

## Purpose
Games that run fully on the device: a person against bots, or bots to watch, on the same rules as
online games, saved to continue, with undo against bots.

## Requirements

### Requirement: Game against bots on the device

A person SHALL be able to start a game against bots that runs on the device without the server.
The person SHALL be seat 1 and the bots take the next seats (placeholder: one bot). Who starts, the
rules, the refusal reasons and the result SHALL be the same as online. Bots SHALL move after a pause
of about one second, computed without blocking the game (off the UI thread). There SHALL be no turn
time limit.

#### Scenario: One bot

- **WHEN** a person starts a game against a bot
- **THEN** seat 1 is the person's and seat 2 is the bot Kettu

#### Scenario: Bot answers

- **WHEN** the person makes a legal move
- **THEN** the bot makes its move about one second later and the person is on turn again

### Requirement: Watching bots on the device

A person SHALL be able to watch a game of bots on the device, speed it up 2× or 4×, and start a new
one when it ends. Such a game SHALL NOT be saved.

#### Scenario: Bots only

- **WHEN** a person starts watching bots
- **THEN** every seat is a bot and they play until the game ends

### Requirement: Saving and continuing

A game against bots SHALL be saved on the device after every step, so a reload or a reopened app
continues it where it was. A saved game of an older, incompatible format SHALL be dropped without an
error.

#### Scenario: Reload

- **WHEN** the person reloads the page in the middle of a game against bots
- **THEN** the same game continues with the same board and turn

#### Scenario: Old save

- **WHEN** the saved game on the device is in an old format
- **THEN** it is not offered for continuing and a new game can be started

### Requirement: Undo against bots

In a running game against bots on the device, "Peru" SHALL take back the person's own last move and
every bot move made after it, giving the turn back to the person. It SHALL be possible to repeat it
back to the person's first move, and SHALL NOT be possible when the person has not moved yet, when
the game has ended, or while watching bots. Undo SHALL NOT exist in online games.

#### Scenario: Undo after the bot moved

- **WHEN** the person moved and the bot answered, and the person taps "Peru"
- **THEN** the board is as it was before the person's move and the person is on turn

#### Scenario: Nothing to undo

- **WHEN** the person has not moved yet
- **THEN** "Peru" is not available
