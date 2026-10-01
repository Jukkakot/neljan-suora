import { describe, expect, it } from "vitest";
import { gameAfter } from "@neljan-suora/rules/testing";
import { Position } from "../src/negamax/position.js";
import { Solver } from "../src/perfect/solve.js";
import { loadBook } from "./load-book.js";

const at = (columns: number[]) => Position.fromGame(gameAfter(columns));

describe("the committed opening book", () => {
  it("is Pons' book: the opening theory, and verdicts the solver agrees with", () => {
    const book = loadBook()!;
    expect(book.depth).toBe(14);
    expect(book.lookup(at([]))).toEqual({ outcome: 1, columns: [3] });
    expect([0, 1, 5, 6].map((column) => book.score(at([column]))! > 0)).toEqual([true, true, true, true]);
    expect([2, 4].map((column) => book.score(at([column])))).toEqual([0, 0]);
    expect(book.score(at([3]))).toBeLessThan(0);
    const solver = new Solver(20);
    for (const line of [[3, 3, 3, 3, 2, 4, 1, 5, 2, 4, 2, 4, 6, 0], [3, 2, 3, 3, 4, 4, 2, 5, 5, 1, 1, 0]]) {
      const known = book.score(at(line));
      if (known !== undefined) expect(Math.sign(known)).toBe(solver.solve(at(line)));
    }
  });
});
