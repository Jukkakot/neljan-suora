# Proposal

## Why

The bot people play against is the kit's best-reply search on a simple line count. It is weak in a
way people notice at once: it lets an open three be finished (seen in the `game-ui` UI check),
because the kit's search only looks at the opponent's three most central replies, so a threat on an
edge column is invisible to it. The game is solved and small (7 × 6), so a proper two-player search
on bitboards plays far better within the same 800 ms budget in the browser. `product.md` → Bot
ambition leaves the choice (kit search or the game's own) to measurement in this change.

## What Changes

- A game-specific searcher in `packages/neljan-suora-bots`: negamax with alpha-beta on two-word
  bitboards, a transposition table, centre-first and threat-first move ordering, immediate win and
  forced-block shortcuts, iterative deepening under the budget (time, depth or both), seeded
  tie-breaking among equally rated root moves. It plugs in as a `Bot` like the kit's players.
- A bitboard evaluation for the new searcher (open lines and threats, with odd/even row parity for
  the threats); the old cell-scan `evaluate` stays for the kit's players used as baselines.
- `devicePlayer` (the one bot offered, on the device and as the online bot runner's brain) becomes
  the new searcher; the budget stays 800 ms (divided by the watching speed).
- Tournaments: the new bot in the registry (`negamax`, budgets `@d<n>`, `@<n>ms`); every tournament
  game starts from a short seeded random opening so deterministic bots do not replay one game.
- `strength.json`: the new bot must beat the kit's search clearly at a fixed depth, and at an equal
  time limit; the old "search beats random" stays (now with the new bot). Tournament workflow green.
- The measurement that settles the kit-vs-own question (nodes per second and a head-to-head) is
  recorded in `design.md` and the wiki.

## Capabilities

### New Capabilities

- `bot-play`: how the offered bot plays: always a legal move within its budget, takes a win, blocks
  the other's immediate win, does not open the cell under a threat, finds a forced win it can see,
  plays the same for the same position, seed and depth; its strength is measured against the kit's
  search and a random player.

### Modified Capabilities

(none: who computes bot moves and how the server validates them, `bot-seats`, do not change)

## Impact

- Workspaces: `packages/neljan-suora-bots` (searcher, evaluation, registry, tournament opening,
  `strength.json`, tests). The client only picks up the new `devicePlayer` through `chooseMove`
  (no client code change expected; the worker stays within its 30 kB size budget). The rules and the
  server are unchanged (the rules may export a bitboard helper if the searcher needs one).
- No protocol, state or UI change; online bot moves are still validated by the server as before.
- Docs: `docs/architecture.md` → Bots, `docs/development.md` (tournament bots), `product.md` →
  Bot ambition (decision recorded), roadmap.
- Kit: the finding that best-reply search with a reply width of 3 misses edge threats in two-player
  games is noted as a kit TODO.
