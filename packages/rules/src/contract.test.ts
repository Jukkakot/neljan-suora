import { describe, expect, it } from "vitest";
import { neljanSuoraRules as rules } from "./contract.js";
import { CELLS, freeCells, startGame } from "./game.js";
import { gameAfter } from "./testing.js";

const seats = [
  { seat: 1, name: "Maija", bot: false },
  { seat: 2, name: "Pekka", bot: true },
];

describe("rules", () => {
  it("starts with an empty board and the seed drawing who starts", () => {
    const game = rules.start(7, seats, {});
    expect(game.cells).toEqual(Array.from({ length: CELLS }, () => 0));
    expect(rules.start(7, seats, {})).toEqual(game);
    const starters = new Set(Array.from({ length: 20 }, (_, seed) => rules.seatOnTurn(rules.start(seed, seats, {}))));
    expect(starters).toEqual(new Set([1, 2]));
  });

  it.each([
    ["a row", [0, 3, 1, 4, 2], [0, 1, 2]],
    ["a column", [1, 0, 4, 2, 7], [1, 4, 7]],
    ["a diagonal", [0, 1, 4, 2, 8], [0, 4, 8]],
    ["the other diagonal", [2, 0, 4, 1, 6], [2, 4, 6]],
  ])("three in %s wins", (_, cells, line) => {
    const game = gameAfter(cells);
    expect([rules.isOver(game), rules.winners(game), rules.seatOnTurn(game), game.line]).toEqual([true, [1], 0, line]);
  });

  it("a full board without three in a row is a draw", () => {
    const game = gameAfter([0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect([rules.isOver(game), rules.winners(game), game.line]).toEqual([true, [], []]);
  });

  it("turns alternate", () => {
    expect(rules.seatOnTurn(gameAfter([4]))).toBe(2);
    expect(rules.seatOnTurn(gameAfter([4], 2))).toBe(1);
  });
});

describe("refusals", () => {
  it("refuses a taken cell and changes nothing", () => {
    const game = gameAfter([4]);
    const before = JSON.stringify(game);
    expect(rules.play(game, 2, { cell: 4 })).toEqual({ ok: false, code: "CELL_TAKEN", facts: { seat: 2, move: "c4" } });
    expect(JSON.stringify(game)).toBe(before);
  });

  it("refuses a move out of turn, by a stranger, off the board and after the end", () => {
    const game = gameAfter([]);
    expect(rules.play(game, 2, { cell: 0 })).toEqual({ ok: false, code: "NOT_YOUR_TURN" });
    expect(rules.play(game, 3, { cell: 0 })).toEqual({ ok: false, code: "NOT_SEATED" });
    expect(rules.play(game, 1, { cell: 9 })).toEqual({ ok: false, code: "INVALID_COMMAND", facts: { seat: 1, move: "c9" } });
    expect(rules.play(gameAfter([0, 3, 1, 4, 2]), 2, { cell: 8 })).toEqual({ ok: false, code: "WRONG_PHASE" });
  });
});

describe("leaving and ending", () => {
  it("the other seat wins when one leaves", () => {
    const game = rules.removeSeat(gameAfter([4]), 1);
    expect([rules.isOver(game), rules.winners(game), game.left]).toEqual([true, [2], [1]]);
  });

  it("ends with no winner when nobody is left", () => {
    const game = rules.end(gameAfter([4]));
    expect([rules.isOver(game), rules.winners(game), rules.seatOnTurn(game)]).toEqual([true, [], 0]);
  });
});

describe("fallback move", () => {
  it("is a free cell, the same for the same game", () => {
    for (let seed = 0; seed < 20; seed++) {
      const game = { ...gameAfter([0, 4, 8]), seed };
      const move = rules.fallbackMove(game)!;
      expect(freeCells(game.cells)).toContain(move.cell);
      expect(rules.fallbackMove(game)).toEqual(move);
    }
  });

  it("plays a whole game to the end", () => {
    let game = startGame(3, [1, 2]);
    for (let i = 0; i < CELLS && !rules.isOver(game); i++) {
      const result = rules.play(game, rules.seatOnTurn(game), rules.fallbackMove(game)!);
      if (!result.ok) throw new Error(result.code);
      game = result.game;
    }
    expect(rules.isOver(game)).toBe(true);
    expect(rules.fallbackMove(game)).toBeUndefined();
  });
});

it("gives log facts and a move text", () => {
  expect(rules.seatRange({})).toEqual({ min: 2, max: 2 });
  expect(rules.turnFacts(gameAfter([0]))).toEqual({ moves: 1 });
  expect(rules.finishFacts(gameAfter([0, 3, 1, 4, 2]))).toEqual({ moves: 5, winners: "1" });
  expect(rules.moveText({ cell: 4 })).toBe("c4");
});
