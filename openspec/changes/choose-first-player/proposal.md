# Proposal

## Why

Who starts is always drawn from the game's seed. Against the perfect bot that matters a lot: when
the bot starts it never loses, so half of all device games cannot be won however well the person
plays. The person wants to choose who starts.

## What Changes

- The start screen's bot game gets a choice **who starts: Minä / Botti / Arvonta**, shown while
  "Pelaan itse" is on. The choice is remembered on the device; the first default is **Arvonta**
  (today's behaviour).
- The rules take an optional first seat from the game's options; without it the seed draws, as
  today.
- **"Pelaa uudelleen"** in a device game lets the other seat start than in the game that just
  ended, whatever the choice was (Arvonta included).
- Only device games against the bot. Friends' games and watched bot games keep the draw.
- Needs a small game-kit change: the device game's rematch asks the game for the next game's
  options (an optional hook), then a kit release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-rules`: who starts — a given first seat, otherwise drawn from the seed.
- `device-games`: the person's choice of who starts; the rematch alternates the starter.
- `start-screen`: the "who starts" choice next to "Pelaa bottia vastaan", remembered.

## Impact

- **Workspaces**: `packages/rules` (the option and who starts), `client` (start screen choice and
  its memory, the client definition's rematch hook, the dev shortcut), `packages/protocol` and
  `server` unchanged (online games never carry the option); `packages/neljan-suora-bots` unchanged.
- **Game kit**: `@game-kit/client` gets an optional `local.rematchOptions` hook; released as a new
  minor version and taken into use here.
- **Saves**: a saved device game keeps its options; old saves (no option) work as before.
- **Docs**: product (who starts), architecture (device game start), development (kit version).
