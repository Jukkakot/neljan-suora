import { LINES, type Game } from "@neljan-suora/rules";

/** A won game is worth this much; lines in progress are worth far less. */
export const WIN = 1000;

/**
 * Rates `game` for `seat`: ±`WIN` once decided (0 for a draw), else the open lines of four: a line
 * holding only `seat`'s discs counts its discs squared, a line holding only the other's counts
 * against. A simple stand-in until `bot-v1`.
 */
export function evaluate(game: Game, seat: number): number {
  if (game.over) return game.winners.includes(seat) ? WIN : game.winners.length > 0 ? -WIN : 0;
  let value = 0;
  for (const line of LINES) {
    let mine = 0;
    let theirs = 0;
    for (const i of line) {
      const owner = game.cells[i]!;
      if (owner === seat) mine++;
      else if (owner !== 0) theirs++;
    }
    if (theirs === 0) value += mine * mine;
    else if (mine === 0) value -= theirs * theirs;
  }
  return value;
}
