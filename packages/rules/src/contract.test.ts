import { describe, expect, it } from "vitest";
import { neljanSuoraRules as rules } from "./contract.js";
import { CELLS } from "./bitboard.js";
import { createRng } from "./rng.js";
import { firstTurn, legalColumns, startGame } from "./game.js";
import { gameAfter } from "./testing.js";

const seats = [
  { seat: 1, name: "Maija", bot: false },
  { seat: 2, name: "Pekka", bot: true },
];

/** The cell at `row` (0 = top) and `column`. */
const at = (row: number, column: number) => row * 7 + column;

describe("The grid and who starts", () => {
  it("A new game: all 42 cells empty, the seed draws who starts", () => {
    const game = rules.start(7, seats, {});
    expect(game.cells).toEqual(Array.from({ length: CELLS }, () => 0));
    expect(CELLS).toBe(42);
    expect(rules.start(7, seats, {})).toEqual(game);
    const starters = new Set(Array.from({ length: 20 }, (_, seed) => rules.seatOnTurn(rules.start(seed, seats, {}))));
    expect(starters).toEqual(new Set([1, 2]));
  });

  it("A chosen first seat: the named seat is on turn, whatever the seed", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(rules.seatOnTurn(rules.start(seed, seats, { firstSeat: 2 }))).toBe(2);
      expect(rules.seatOnTurn(rules.start(seed, seats, { firstSeat: 1 }))).toBe(1);
    }
  });

  it("no first seat: the same starter as before for 200 seeds", () => {
    for (let seed = 0; seed < 200; seed++) {
      const drawn = [1, 2][createRng(seed).int(0, 1)];
      expect(firstTurn(seed, [1, 2])).toBe(drawn);
      expect(rules.seatOnTurn(rules.start(seed, seats, {}))).toBe(drawn);
    }
  });

  it("a first seat that is not seated is ignored", () => {
    for (let seed = 0; seed < 20; seed++) expect(firstTurn(seed, [1, 2], 3)).toBe(firstTurn(seed, [1, 2]));
  });

  it("Turns alternate", () => {
    expect(rules.seatOnTurn(gameAfter([3]))).toBe(2);
    expect(rules.seatOnTurn(gameAfter([3], 2))).toBe(1);
  });
});

describe("A move drops into a column", () => {
  it("The disc falls to the bottom", () => {
    expect(gameAfter([2]).cells[at(5, 2)]).toBe(1);
  });

  it("Stacking: the third disc lands third from the bottom", () => {
    const game = gameAfter([4, 4, 4]);
    expect([at(5, 4), at(4, 4), at(3, 4), at(2, 4)].map((c) => game.cells[c])).toEqual([1, 2, 1, 0]);
  });

  it("A full column is refused with COLUMN_FULL and changes nothing", () => {
    const game = gameAfter([0, 0, 0, 0, 0, 0]);
    const before = JSON.stringify(game);
    expect(legalColumns(game.cells)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rules.play(game, 1, { column: 0 })).toEqual({ ok: false, code: "COLUMN_FULL", facts: { seat: 1, move: "col0" } });
    expect(JSON.stringify(game)).toBe(before);
  });

  it("Off the grid: column 7, -1 or a fraction is malformed", () => {
    const game = gameAfter([]);
    expect(rules.play(game, 1, { column: 7 })).toEqual({ ok: false, code: "INVALID_COMMAND", facts: { seat: 1, move: "col7" } });
    expect(rules.play(game, 1, { column: -1 })).toMatchObject({ ok: false, code: "INVALID_COMMAND" });
    expect(rules.play(game, 1, { column: 1.5 })).toMatchObject({ ok: false, code: "INVALID_COMMAND" });
  });

  it("refuses a move out of turn, by a stranger and after the end", () => {
    const game = gameAfter([]);
    expect(rules.play(game, 2, { column: 0 })).toEqual({ ok: false, code: "NOT_YOUR_TURN" });
    expect(rules.play(game, 3, { column: 0 })).toEqual({ ok: false, code: "NOT_SEATED" });
    expect(rules.play(gameAfter([0, 1, 0, 1, 0, 1, 0]), 2, { column: 1 })).toEqual({ ok: false, code: "WRONG_PHASE" });
  });
});

describe("Four in a row wins", () => {
  it.each([
    ["Four across", [0, 0, 1, 1, 2, 2, 3], [at(5, 0), at(5, 1), at(5, 2), at(5, 3)]],
    ["Four up", [6, 5, 6, 5, 6, 5, 6], [at(2, 6), at(3, 6), at(4, 6), at(5, 6)]],
    // Rising: seat 1 at (5,0), (4,1), (3,2), (2,3).
    ["Four along a rising diagonal", [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3], [at(2, 3), at(3, 2), at(4, 1), at(5, 0)]],
    // Falling: seat 1 at (2,3), (3,4), (4,5), (5,6).
    ["Four along a falling diagonal", [6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3], [at(2, 3), at(3, 4), at(4, 5), at(5, 6)]],
  ])("%s", (_, columns, line) => {
    const game = gameAfter(columns);
    expect([rules.isOver(game), rules.winners(game), rules.seatOnTurn(game), game.line]).toEqual([true, [1], 0, line]);
  });

  it("Two lines at once: the winning line holds both", () => {
    // Columns bottom up: seat 2 under seat 1 in columns 0–2, seat 1 three high in column 3.
    const stacks = [[2, 2, 2, 1], [2, 2, 2, 1], [2, 2, 2, 1], [1, 1, 1]];
    const cells = Array.from({ length: CELLS }, () => 0);
    stacks.forEach((stack, column) => stack.forEach((seat, height) => (cells[at(5 - height, column)] = seat)));
    const game = { ...startGame(1, [1, 2]), cells, turn: 1, moves: 15 };
    const result = rules.play(game, 1, { column: 3 });
    expect(result.ok && result.game.line).toEqual([at(2, 0), at(2, 1), at(2, 2), at(2, 3), at(3, 3), at(4, 3), at(5, 3)]);
  });

  it("A full grid without four in a row is a draw", () => {
    // Columns filled in pairs with the colour pattern swapped every two columns: no four anywhere.
    const order = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2, 4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4, 6, 6, 6, 6, 6, 6];
    const game = gameAfter(order);
    expect([rules.isOver(game), rules.winners(game), game.line, game.moves]).toEqual([true, [], [], 42]);
  });
});

describe("leaving and ending", () => {
  it("the other seat wins when one leaves", () => {
    const game = rules.removeSeat(gameAfter([3]), 1);
    expect([rules.isOver(game), rules.winners(game), game.left]).toEqual([true, [2], [1]]);
  });

  it("ends with no winner when nobody is left", () => {
    const game = rules.end(gameAfter([3]));
    expect([rules.isOver(game), rules.winners(game), rules.seatOnTurn(game)]).toEqual([true, [], 0]);
  });
});

describe("fallback move", () => {
  it("is a legal column, the same for the same game", () => {
    for (let seed = 0; seed < 20; seed++) {
      const game = { ...gameAfter([0, 0, 0, 0, 0, 0]), seed };
      const move = rules.fallbackMove(game)!;
      expect(legalColumns(game.cells)).toContain(move.column);
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
  expect(rules.finishFacts(gameAfter([0, 1, 0, 1, 0, 1, 0]))).toEqual({ moves: 7, winners: "1" });
  expect(rules.moveText({ column: 4 })).toBe("col4");
});
