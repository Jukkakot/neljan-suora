import { LINES, type Game } from "@neljan-suora/rules";

/** A won game is worth this much; lines in progress are worth far less. */
export const WIN = 1000;

/**
 * Rates `game` for `seat`: ±`WIN` once decided (0 for a draw), else the open lines: a line holding
 * only `seat`'s marks counts its marks squared, a line holding only the other's counts against.
 * The placeholder's evaluation: replace it with the real game's.
 */
export function evaluate(game: Game, seat: number): number {
  if (game.over) return game.winners.includes(seat) ? WIN : game.winners.length > 0 ? -WIN : 0;
  let value = 0;
  for (const line of LINES) {
    const marks = line.map((i) => game.cells[i]!);
    const mine = marks.filter((m) => m === seat).length;
    const theirs = marks.filter((m) => m !== 0 && m !== seat).length;
    if (theirs === 0) value += mine * mine;
    else if (mine === 0) value -= theirs * theirs;
  }
  return value;
}
