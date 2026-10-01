import { describe, expect, it } from "vitest";
import { CELLS, createRng, legalColumns, playMove, startGame, type Game } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { negamaxBot, WIN } from "../negamax/search.js";
import { Position } from "../negamax/position.js";
import { Solver, type Outcome } from "./solve.js";

const solver = new Solver(18);

/** A random game of `discs` discs that is not over, or undefined when it ended earlier. */
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

/** The exact outcome by full-depth heuristic search (its proven scores are exact at full depth). */
function exact(game: Game): Outcome {
  let info = { depth: 0, nodes: 0, score: 0 };
  const bot = negamaxBot({ tableBits: 16, report: (i) => (info = i) });
  const column = bot.choose(game, { depth: CELLS }, createRng(1))!;
  // A single safe root is answered without a search: its score is not a verdict, so look further.
  if (info.nodes === 0 && info.score === 0) {
    const result = playMove(game, game.turn, { column });
    if (!result.ok) throw new Error(result.code);
    const next = result.game;
    if (next.over) return next.winners.length === 0 ? 0 : 1;
    return (0 - exact(next)) as Outcome;
  }
  return info.score > WIN - 100 ? 1 : info.score < -(WIN - 100) ? -1 : 0;
}

describe("solver", () => {
  it("agrees with exact full-depth search on late positions", () => {
    let checked = 0;
    for (let seed = 1; checked < 300; seed++) {
      const game = randomGame(seed, 28 + (seed % 7));
      if (!game) continue;
      expect(solver.solve(Position.fromGame(game)), `seed ${seed}`).toBe(exact(game));
      checked++;
    }
  });

  it("gives every root column that reaches the best outcome", () => {
    for (let seed = 1, checked = 0; checked < 40; seed++) {
      const game = randomGame(seed, 30);
      if (!game) continue;
      const verdict = solver.solveRoot(Position.fromGame(game))!;
      // A win at once is answered on its own (covered below).
      if (legalColumns(game.cells).some((column) => Position.fromGame(game).isWinningMove(column))) continue;
      for (const column of legalColumns(game.cells)) {
        const result = playMove(game, game.turn, { column });
        if (!result.ok) throw new Error(result.code);
        const value = result.game.over ? (result.game.winners.length > 0 ? 1 : 0) : 0 - solver.solve(Position.fromGame(result.game))!;
        expect(verdict.columns.includes(column), `seed ${seed} column ${column}`).toBe(value === verdict.outcome);
      }
      checked++;
    }
  });

  it("solves a position and its mirror image alike", () => {
    for (let seed = 1, checked = 0; checked < 30; seed++) {
      const columns: number[] = [];
      const rng = createRng(seed);
      let game = startGame(seed, [1, 2]);
      while (game.moves < 26 && !game.over) {
        const legal = legalColumns(game.cells);
        const column = legal[rng.int(0, legal.length - 1)]!;
        columns.push(column);
        const result = playMove(game, game.turn, { column });
        if (!result.ok) throw new Error(result.code);
        game = result.game;
      }
      if (game.over) continue;
      const mirrored = gameAfter(columns.map((column) => 6 - column));
      const verdict = solver.solveRoot(Position.fromGame(game))!;
      const mirror = solver.solveRoot(Position.fromGame(mirrored))!;
      expect(mirror.outcome).toBe(verdict.outcome);
      expect([...mirror.columns].sort()).toEqual(verdict.columns.map((column) => 6 - column).sort());
      checked++;
    }
  });

  it("gives up when the node limit runs out", () => {
    expect(solver.solveRoot(Position.fromGame(gameAfter([3])), { nodes: 1000 })).toBeUndefined();
    expect(solver.nodes).toBeLessThanOrEqual(1002);
  });

  it("gives up when the time runs out", () => {
    expect(solver.solve(Position.fromGame(gameAfter([3, 3])), { expired: () => true })).toBeUndefined();
  });

  it("takes an immediate win at the root", () => {
    expect(solver.solveRoot(Position.fromGame(gameAfter([0, 1, 0, 1, 0, 2])))).toEqual({ outcome: 1, columns: [0] });
  });
});
