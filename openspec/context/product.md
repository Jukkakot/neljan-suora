# Product

Decisions about what the game is and how it feels, not yet written as specs. Once a spec exists
in `openspec/specs/`, the spec wins. The parts marked **TODO** are agreed in the first changes
(roadmap); the rest is what the game kit and the copied screens already do.

## The game (rules in our own words)

Neljän suora is the classic gravity four-in-a-row game, with our own name and look. The rules land
in roadmap `rules-engine`; until then the placeholder game Ristinolla (tic-tac-toe) stands in, so
every part of the contract runs.

- Two seats. An upright grid of 7 columns and 6 rows.
- A move is choosing a column that is not full; the disc drops to the lowest free cell of it.
- Four of the mover's discs in a row horizontally, vertically or diagonally win at once, and the
  winning row is shown. A full grid without such a row is a draw. No passing, no scores beyond
  win, draw or loss.
- Who starts is drawn from the game's seed; a rematch lets the other seat start (`rules-engine`
  confirms).
- The commercial game's name, logos, box look and signature colours never appear in the UI,
  assets, texts or repo (nfr → Legal).

## Controls

Column first: a tap anywhere in a column shows a ghost disc in the cell it would land in; a second
tap on the same column (or the confirm button) drops it; another column moves the ghost. No drag
needed. Same "few taps, one deliberate confirm" rule as under Mobile.

## Bot ambition

The game is solved (the first player wins with perfect play), so strong play is reachable in the
browser: bitboard negamax with alpha-beta, a transposition table, centre-first move ordering and
iterative deepening within the time budget. Whether the kit's generic search is fast enough or the
game needs its own searcher is decided in `bot-v1` by measurement.

## Modes

- **Against bots on the device:** a person against bots, fully in the browser (no server), also
  offline; saved after every step and continued after a reload; "Peru" takes back the person's last
  move. Watching bots only as well, at 1×, 2× or 4×.
- **Online:** a waiting room with an invite link; empty seats get bots. The host's browser computes
  the bots' moves (Web Worker); the server validates them like any move. Bot strength therefore
  depends on the host's device (accepted).
- **Spectators:** running online games can be watched.

## Start screen and lobby

- Balanced: two equally visible ways in, "Pelaa bottia vastaan" and "Luo peli kavereille". The
  lobby stays simple and gets people playing quickly. Open and running games are a secondary
  "Liity peliin" section, shown only when there is something in it.
- Nickname prefilled with a random name; a dice draws another.
- Turn time limit online: 120 s; then the others may remove the slow player.

## Bots

- The player is offered **one** bot, the strongest the device manages within the time budget. The
  bot interface takes a budget (time, depth or iterations), so levels can come later without rework.
- The bot "brains" are the kit's game-independent library (`@game-kit/bots`: greedy, best-reply
  search, MCTS, budgets, the worker harness, tournaments); the game plugs in through its adapter
  (`packages/neljan-suora-bots`).
- Bot strength is measured, not guessed: tournaments and Elo, requirements in `strength.json`.
- Bot names: Kettu, Ilves, Pöllö, Näätä (the kit's; the theme may rename them).

## Theme "Placeholder"

**TODO** (roadmap `theme`): agree the theme with light and dark mockups: the visual concept
(materials, palette, shapes), the seat colours, the motion at the end, and the voice of the texts
and names. Until then a neutral look stands in (`client/src/ui/tokens.css`): paper and graphite
surfaces, an indigo accent, four seat colours, both light and dark designed.

- Every project has a light and a dark theme, designed with equal care. The device setting is
  followed unless the player forces one in the settings.
- Motion: restrained in play (marks settle in ≤ 250 ms, the last move is marked), playful at the
  end (counts count up, the winner's row shimmers, falling squares). `prefers-reduced-motion` stops
  all of it.
- Accessibility is basic only: contrast and tap targets; colour alone may identify a player.

## Mobile

- Portrait phone first (reference device Galaxy S24); a wide screen puts the board beside the
  controls.
- Few taps, but one deliberate confirm per move: the first tap chooses, the second (or the confirm
  button) makes the move. Nothing is played on release.
