# Spec Delta

## ADDED Requirements

### Requirement: The opening book is looked up on the server

The bot's opening book SHALL stay on the game server and SHALL NOT be downloaded to the browser.
For each bot move (and each hint) in a position the book can hold, the browser SHALL ask the server
for the position's verdict (its outcome and the columns of its best score) before the bot chooses,
and the bot SHALL choose among those columns. When the server does not answer quickly (offline,
asleep, slow, an error, or the position is not in the book), the bot SHALL choose as if it had no
book, still within its budget. The server SHALL answer only well-formed, legal positions and SHALL
limit how often one address may ask.

#### Scenario: Opening move from the server's book

- **WHEN** the bot plays the first seat on an empty board and the server answers
- **THEN** it drops into column 3, the only winning first move

#### Scenario: No server

- **WHEN** the device is offline and the bot is on turn in the opening
- **THEN** the bot still answers with a legal column within its budget

#### Scenario: Nothing to download

- **WHEN** a person plays a whole game against the bot
- **THEN** the browser fetches no opening book file

#### Scenario: Bad position

- **WHEN** the server is asked about a position that cannot arise in a game (wrong size, floating
  discs, wrong disc counts)
- **THEN** it answers with an error and no verdict

## REMOVED Requirements

### Requirement: The opening book is loaded on demand

**Reason**: The 33.5 MB book crashed the bot worker on a phone; the book now stays on the server.

**Migration**: Covered by "The opening book is looked up on the server"; offline play has no book.
