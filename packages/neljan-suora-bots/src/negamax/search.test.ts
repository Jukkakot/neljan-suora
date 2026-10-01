import { describe, expect, it } from "vitest";
import { systemClock } from "@game-kit/bots";
import { createRng, legalColumns, type Game } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { negamaxBot, WIN } from "./search.js";
import { evaluatePosition } from "./evaluation.js";
import { Position } from "./position.js";

/** The bot's column for `game` and what it reported. */
function ask(game: Game, depth: number, seed = 1) {
  let info = { depth: 0, nodes: 0, score: 0 };
  const bot = negamaxBot({ tableBits: 16, report: (i) => (info = i) });
  const column = bot.choose(game, { depth }, createRng(seed));
  return { column, ...info };
}

describe("negamax tactics", () => {
  it("takes a win on an edge", () => {
    for (const depth of [1, 6]) expect(ask(gameAfter([0, 1, 0, 1, 0, 2]), depth).column).toBe(0);
  });

  it("blocks an edge threat", () => {
    for (const depth of [1, 6]) expect(ask(gameAfter([4, 0, 5, 0, 6]), depth).column).toBe(3);
  });

  it("does not drop under the other's winning cell", () => {
    // Seat 1 holds row 2 in columns 3–5 (column 6 blocked); a disc in empty column 2 lets it win above.
    const game = gameAfter([5, 3, 3, 4, 4, 6, 5, 6, 0]);
    expect(game.turn).toBe(2);
    for (const depth of [1, 2, 6]) expect(ask(game, depth).column).not.toBe(2);
  });

  it("plays a double threat and sees the forced win", () => {
    // Seat 1 to move with two in the bottom row (columns 2, 3), both ends open.
    const result = ask(gameAfter([2, 2, 3, 3]), 4);
    expect([1, 4]).toContain(result.column);
    expect(result.score).toBe(WIN - 3);
  });

  it("reports a proven loss and still answers legally", () => {
    // Seat 1 has a double threat in the bottom row; seat 2 loses whatever it does.
    const game = gameAfter([2, 2, 3, 3, 4]);
    const result = ask(game, 4);
    expect(legalColumns(game.cells)).toContain(result.column);
    expect(result.score).toBe(-(WIN - 2));
  });
});

describe("negamax answers", () => {
  it("plays the one open column", () => {
    const game = gameAfter([5, 3, 1, 2, 3, 3, 2, 5, 3, 1, 1, 3, 0, 5, 2, 4, 4, 0, 3, 4, 4, 2, 4, 4, 5, 2, 1, 0, 5, 5, 1, 1, 0, 0, 0, 2]);
    expect(legalColumns(game.cells)).toEqual([6]);
    expect(ask(game, 4).column).toBe(6);
  });

  it("answers nothing once the game is over", () => {
    expect(ask(gameAfter([0, 1, 0, 1, 0, 1, 0]), 4).column).toBeUndefined();
  });

  it("chooses the same column for the same position, depth and seed", () => {
    const game = gameAfter([3, 3, 2]);
    const first = ask(game, 6, 7);
    expect(ask(game, 6, 7)).toEqual(first);
    expect(first.depth).toBe(6);
  });

  it("stops at the deadline and still answers legally", () => {
    let time = 0;
    const bot = negamaxBot({ tableBits: 16, now: () => (time += 1) });
    const column = bot.choose(gameAfter([]), { timeMs: 50 }, createRng(1));
    expect(legalColumns(gameAfter([]).cells)).toContain(column);
  });

  it("answers within a real time budget", () => {
    const bot = negamaxBot();
    bot.choose(gameAfter([3]), { depth: 2 }, createRng(1)); // allocate the table first
    const started = systemClock();
    bot.choose(gameAfter([3, 3]), { timeMs: 200 }, createRng(1));
    expect(systemClock() - started).toBeLessThan(250);
  });
});

describe("evaluation", () => {
  it("counts the first side's bottom-row threats as on its own parity", () => {
    // Seat 1 (moved first) holds columns 1–3 of the bottom row: two winning cells on row 1 (odd).
    const position = Position.fromGame(gameAfter([1, 6, 2, 6, 3]));
    expect(evaluatePosition(position, { goodThreat: 1, otherThreat: 0, higherThreat: 0, material: 0 })).toBe(-2);
    expect(evaluatePosition(position, { goodThreat: 0, otherThreat: 1, higherThreat: 0, material: 0 })).toBe(0);
  });

  it("rates a position and its mirror image the same", () => {
    const left = Position.fromGame(gameAfter([0, 1, 1, 2, 3, 2, 2]));
    const right = Position.fromGame(gameAfter([6, 5, 5, 4, 3, 4, 4]));
    expect(evaluatePosition(left)).toBe(evaluatePosition(right));
    expect(evaluatePosition(left)).not.toBe(0);
  });
});
