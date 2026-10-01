import { playMove, startGame, type Game } from "./game.js";

/** Test fixture: a two-seat game where `firstSeat` starts and `columns` are played in turn. */
export function gameAfter(columns: readonly number[], firstSeat = 1, seed = 1): Game {
  const start = { ...startGame(seed, [1, 2]), turn: firstSeat };
  return columns.reduce((game, column) => {
    const result = playMove(game, game.turn, { column });
    if (!result.ok) throw new Error(`column ${column} refused: ${result.code}`);
    return result.game;
  }, start);
}
