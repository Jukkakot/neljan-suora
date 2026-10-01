# Spec Delta

## ADDED Requirements

### Requirement: The person chooses who starts

A game against the bot on the device SHALL start with the starter chosen on the start screen: the
person ("Minä"), the bot ("Botti"), or drawn from the game's seed ("Arvonta"). A saved game SHALL
keep its starter when it is continued. Watched bot games SHALL keep the draw.

#### Scenario: The person starts

- **WHEN** the person has chosen "Minä" and starts a game against the bot
- **THEN** the person is on turn at once

#### Scenario: The bot starts

- **WHEN** the person has chosen "Botti" and starts a game against the bot
- **THEN** the bot makes the first move

### Requirement: The rematch alternates the starter

"Pelaa uudelleen" after a game against the bot on the device SHALL start the next game with the
other seat on turn first than in the game that just ended, whatever was chosen on the start screen.
It SHALL NOT change the remembered choice.

#### Scenario: After the person started

- **WHEN** a game the person started has ended and the person taps "Pelaa uudelleen"
- **THEN** the bot makes the first move of the new game

#### Scenario: After a drawn starter

- **WHEN** "Arvonta" drew the bot as the starter, the game ended and the person taps "Pelaa uudelleen"
- **THEN** the person is on turn first in the new game
