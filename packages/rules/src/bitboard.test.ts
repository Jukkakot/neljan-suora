import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { bitsOf, CELLS, COLUMNS, hasFour, LINES, ROWS } from "./bitboard.js";
import { legalColumns, playMove, startGame, type Game } from "./game.js";

/** Plays `picks` (each an index into the legal columns) from a fresh game until it ends; returns every game on the way. */
function playOut(seed: number, picks: readonly number[]): Game[] {
  const games = [startGame(seed, [1, 2])];
  for (const pick of picks) {
    const game = games.at(-1)!;
    if (game.over) break;
    const legal = legalColumns(game.cells);
    const result = playMove(game, game.turn, { column: legal[pick % legal.length]! });
    if (!result.ok) throw new Error(result.code);
    games.push(result.game);
  }
  return games;
}

const games = fc.tuple(fc.nat(), fc.array(fc.nat(), { minLength: CELLS, maxLength: CELLS }));

/** Fours by a plain scan of every line. */
const scanFour = (cells: readonly number[], seat: number) => LINES.some((line) => line.every((i) => cells[i] === seat));

describe("bitboard", () => {
  it("has 69 lines of four", () => {
    expect(LINES).toHaveLength(69);
  });

  it("finds four in a row exactly when a plain scan does", () => {
    fc.assert(
      fc.property(games, ([seed, picks]) => {
        for (const game of playOut(seed, picks)) {
          for (const seat of [1, 2]) expect(hasFour(bitsOf(game.cells, seat))).toBe(scanFour(game.cells, seat));
        }
      }),
    );
  });

  it("finds every single line of four on an otherwise empty grid, and no three", () => {
    for (const line of LINES) {
      const cells = Array.from({ length: CELLS }, () => 0);
      for (const i of line) cells[i] = 1;
      expect(hasFour(bitsOf(cells, 1))).toBe(true);
      cells[line[0]!] = 0;
      expect(hasFour(bitsOf(cells, 1))).toBe(false);
    }
  });
});

describe("games of random legal moves", () => {
  it("end within 42 moves with gravity, balanced counts and a line of the winner's", () => {
    fc.assert(
      fc.property(games, ([seed, picks]) => {
        const game = playOut(seed, picks).at(-1)!;
        expect(game.over).toBe(true);
        expect(game.moves).toBeLessThanOrEqual(CELLS);
        for (let column = 0; column < COLUMNS; column++) {
          for (let row = 0; row < ROWS - 1; row++) {
            if (game.cells[row * COLUMNS + column] !== 0) expect(game.cells[(row + 1) * COLUMNS + column]).not.toBe(0);
          }
        }
        const counts = [1, 2].map((seat) => game.cells.filter((c) => c === seat).length);
        expect(Math.abs(counts[0]! - counts[1]!)).toBeLessThanOrEqual(1);
        expect(counts[0]! + counts[1]!).toBe(game.moves);
        if (game.winners.length > 0) {
          expect(game.line.length).toBeGreaterThanOrEqual(4);
          expect(game.line.every((i) => game.cells[i] === game.winners[0])).toBe(true);
        } else {
          expect([game.moves, game.line]).toEqual([CELLS, []]);
        }
      }),
    );
  });
});
