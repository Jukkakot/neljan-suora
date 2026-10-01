# Spec Delta

## Purpose

The game's look and voice as the player sees it: the theme "Marjat" with its two berry seats, the
light and dark variants, the motion of a placed piece and of a won game, and the end-of-game copy.

## ADDED Requirements

### Requirement: Seats are berries
Each seat SHALL be shown as a round berry: seat 1 a red lingonberry (puolukka), seat 2 a blue
blueberry (mustikka) that also carries a small crown, so the two read apart without colour. The
same berry SHALL stand for the seat everywhere it appears: on the board, in the chosen cell's
preview, in the player strip and in the result table. Spoken labels SHALL name the berry
("puolukka", "mustikka").

#### Scenario: The board shows berries
- **WHEN** seat 1 has a piece in a cell and seat 2 in another
- **THEN** the first cell shows a red berry and the second a blue berry with a crown, and their
  labels read "puolukka" and "mustikka"

#### Scenario: The player strip uses the same berry
- **WHEN** a game with two seats is shown
- **THEN** each player's chip shows their seat's berry, the viewer's own with a ring

### Requirement: Light and dark themes
The game SHALL have a light theme (a pale lichen page, a birch-crate board with moss-green holes)
and a dark theme (a forest-night page, a dark wooden board with dark moss holes), each designed
with its own colours rather than inverted. It SHALL follow the device's colour scheme unless the
player forces light or dark in the settings. Text SHALL keep at least 4.5:1 contrast with its
surface, and each berry at least 3:1 with an empty hole, in both themes.

#### Scenario: Following the device
- **WHEN** the device prefers dark and the settings say "follow device"
- **THEN** the dark theme is shown

#### Scenario: Forcing light
- **WHEN** the device prefers dark and the player chooses light in the settings
- **THEN** the light theme is shown

### Requirement: Motion of a placed piece
A newly placed berry SHALL settle with a short squish (it lands flattened and springs back) that
ends within 250 ms, and the last move SHALL stay marked until the next move. When the device asks
for reduced motion, the berry SHALL appear at rest at once and the mark SHALL remain.

#### Scenario: A move settles in
- **WHEN** a move is made
- **THEN** the new berry squishes and is at rest within 250 ms, and it is marked as the last move

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion and a move is made
- **THEN** the berry appears at rest without animation and is marked as the last move

### Requirement: Motion of a won game
When a game ends with a win, the winning line's berries SHALL shine (a ring in leaf green) and
stay shining, and leaves SHALL fall once over the screen, gone within 2.5 s and never blocking a
tap. A draw SHALL show no falling leaves. When the device asks for reduced motion, the line SHALL
shine without animation and no leaves SHALL fall.

#### Scenario: A win
- **WHEN** a game ends with a win
- **THEN** the winning line's berries shine and leaves fall once, gone within 2.5 s

#### Scenario: A draw
- **WHEN** a game ends in a draw
- **THEN** no line shines and no leaves fall

### Requirement: Restrained voice
Texts in play SHALL be plain and clear; the piece SHALL be called a berry ("marja", "berry").
Theme words SHALL appear only in names and in the end-of-game lines: "Voitit – kori täynnä!"
("You won – basket full!"), "{name} voitti – kori täynnä" ("{name} won – basket full") and
"Tasapeli – laatikko täynnä" ("Draw – the crate is full"). The move's confirm button SHALL read
"Aseta" ("Place").

#### Scenario: The viewer wins
- **WHEN** the viewer wins a game
- **THEN** the end of the game reads "Voitit – kori täynnä!" in Finnish

#### Scenario: Another player wins
- **WHEN** the bot Kettu wins a game the viewer played
- **THEN** the end of the game reads "Kettu voitti – kori täynnä"

#### Scenario: Confirming a move
- **WHEN** the viewer has chosen a cell
- **THEN** the confirm button reads "Aseta"

### Requirement: Own look, not the commercial game's
The theme SHALL NOT use the commercial four-in-a-row game's name, logo, box look or its
signature colours (red and yellow pieces in a blue frame). The board SHALL be wood-coloured, not
blue, and no seat SHALL be yellow.

#### Scenario: Board and seat colours
- **WHEN** a game is shown in either theme
- **THEN** the board is a wood colour and the two seats are red and blue berries
