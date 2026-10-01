# start-screen Specification

## Purpose
The first screen: a nickname and two equally visible ways into a game, against a bot on the device
or a new game for friends, with the open and running public games as a secondary way in.

## Requirements

### Requirement: Two ways in

The start screen SHALL show the nickname and two equally visible ways in: "Pelaa bottia vastaan"
and "Luo peli kavereille". The bot way SHALL start a game against the bots at once on the device,
without waiting for the server; with "Pelaan itse" off it SHALL start a game of bots to watch
instead. "Luo peli kavereille" SHALL always create a new online game and open its waiting room,
where the invite link is shared; it SHALL wait while the server wakes up. A continuable game SHALL
still be offered first ("Jatka peliä").

#### Scenario: Against a bot

- **WHEN** a player taps "Pelaa bottia vastaan"
- **THEN** a game against the bot Kettu starts on the device

#### Scenario: Watching bots

- **WHEN** a player turns "Pelaan itse" off and taps "Katso bottien peliä"
- **THEN** a game of bots only starts on the device for the player to watch

#### Scenario: Friends

- **WHEN** a player taps "Luo peli kavereille" while another public game is waiting for players
- **THEN** a new game is created with the player as its host, and the other game is not joined

#### Scenario: Server asleep

- **WHEN** the server is still waking up
- **THEN** "Luo peli kavereille" is disabled with the wake-up status shown, and the bot way works

### Requirement: Open and running games

The public games of the page's pool that wait for players SHALL be listed for joining and the
running watchable ones for watching, in a secondary section below the two ways in. The section
SHALL be hidden when both lists are empty or the list could not be loaded.

#### Scenario: Nothing to show

- **WHEN** no public game waits or runs
- **THEN** the start screen shows no games section

#### Scenario: A waiting game

- **WHEN** a public game in the same pool waits for players
- **THEN** it is listed with its host and seated count, and a tap joins it

### Requirement: Nickname

The nickname field SHALL be prefilled with a random name (or the last one used), with a button that
draws a new one. A way in that needs a nickname SHALL be disabled while the nickname is invalid,
with the reason shown.

#### Scenario: Invalid nickname

- **WHEN** the nickname is one character long
- **THEN** both ways in are disabled and the length rule is shown

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
