import { playMove, startGame, type Game } from "./game.js";

/** Test fixture: a two-seat game where `firstSeat` starts and `cells` are marked in turn. */
export function gameAfter(cells: readonly number[], firstSeat = 1, seed = 1): Game {
  const start = { ...startGame(seed, [1, 2]), turn: firstSeat };
  return cells.reduce((game, cell) => {
    const result = playMove(game, game.turn, { cell });
    if (!result.ok) throw new Error(`cell ${cell} refused: ${result.code}`);
    return result.game;
  }, start);
}
