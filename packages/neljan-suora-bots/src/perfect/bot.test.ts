import { describe, expect, it } from "vitest";
import { createRng, legalColumns, playMove, startGame, type Game } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { Position } from "../negamax/position.js";
import { negamaxBot } from "../negamax/search.js";
import { Book, bookEntry, writeBook } from "./book.js";
import { perfectBot, SOLVE_NODES, type VerdictSource } from "./bot.js";
import { Solver } from "./solve.js";

const solver = new Solver(18);
const small = { solverTableBits: 18, searchTableBits: 16 };
const bookOf = (...entries: [number[], -1 | 0 | 1, number[]][]) =>
  Book.parse(writeBook(entries.map(([line, outcome, columns]) => bookEntry(Position.fromGame(gameAfter(line)), outcome, columns)), SOLVE_NODES))!;

/** A random game of `discs` discs that is not over, or undefined. */
function randomGame(seed: number, discs: number): Game | undefined {
  const rng = createRng(seed);
  let game = startGame(seed, [1, 2]);
  while (game.moves < discs) {
    const columns = legalColumns(game.cells);
    const result = playMove(game, game.turn, { column: columns[rng.int(0, columns.length - 1)]! });
    if (!result.ok) throw new Error(result.code);
    game = result.game;
    if (game.over) return undefined;
  }
  return game;
}

describe("perfect bot", () => {
  it("opens in the centre from its book", () => {
    const bot = perfectBot({ ...small, book: bookOf([[], 1, [3]]) });
    expect(bot.choose(gameAfter([]), { depth: 8, iterations: SOLVE_NODES }, createRng(1))).toBe(3);
  });

  it("keeps the best outcome on late positions", () => {
    const bot = perfectBot(small);
    for (let seed = 1, checked = 0; checked < 60; seed++) {
      const game = randomGame(seed, 24 + (seed % 6));
      if (!game) continue;
      const best = solver.solveRoot(Position.fromGame(game))!;
      const column = bot.choose(game, { depth: 4 }, createRng(seed))!;
      const result = playMove(game, game.turn, { column });
      if (!result.ok) throw new Error(result.code);
      const after = result.game.over ? (result.game.winners.length > 0 ? 1 : 0) : 0 - solver.solve(Position.fromGame(result.game))!;
      expect(after, `seed ${seed}`).toBe(best.outcome);
      checked++;
    }
  });

  it("falls back to the heuristic column when the solve limit runs out", () => {
    let source: VerdictSource | undefined;
    const bot = perfectBot({ ...small, report: (info) => (source = info.source) });
    const game = gameAfter([3, 2]);
    const column = bot.choose(game, { depth: 6, iterations: 500 }, createRng(5));
    expect(source).toBe("unsettled");
    expect(column).toBe(negamaxBot({ tableBits: 16 }).choose(game, { depth: 6 }, createRng(5)));
  });

  it("chooses the same book column for the same seed", () => {
    const bot = perfectBot({ ...small, book: bookOf([[3, 3], 1, [2, 3, 4]]) });
    const game = gameAfter([3, 3]);
    const first = bot.choose(game, { depth: 6, iterations: SOLVE_NODES }, createRng(7));
    expect([2, 3, 4]).toContain(first);
    expect(bot.choose(game, { depth: 6, iterations: SOLVE_NODES }, createRng(7))).toBe(first);
  });

  it("answers an unsolved position by the deadline", () => {
    let time = 0;
    const bot = perfectBot({ ...small, now: () => (time += 1) });
    const column = bot.choose(gameAfter([3]), { timeMs: 300 }, createRng(1));
    expect(legalColumns(gameAfter([3]).cells)).toContain(column);
    expect(time).toBeLessThanOrEqual(350);
  });

  it("uses a book set later and answers nothing once the game is over", () => {
    const bot = perfectBot(small);
    bot.setBook(bookOf([[0, 0], 0, [6]]));
    expect(bot.choose(gameAfter([0, 0]), { depth: 2, iterations: 10 }, createRng(1))).toBe(6);
    expect(bot.choose(gameAfter([0, 1, 0, 1, 0, 1, 0]), { depth: 2 }, createRng(1))).toBeUndefined();
  });

  it("never misses the tactics", () => {
    const bot = perfectBot(small);
    // The tactics come before any search: a small solve limit shows they do not depend on it.
    const budget = { depth: 1, iterations: 20_000 };
    expect(bot.choose(gameAfter([0, 1, 0, 1, 0, 2]), budget, createRng(1))).toBe(0);
    expect(bot.choose(gameAfter([4, 0, 5, 0, 6]), budget, createRng(1))).toBe(3);
    expect(bot.choose(gameAfter([5, 3, 3, 4, 4, 6, 5, 6, 0]), budget, createRng(1))).not.toBe(2);
  });
});
