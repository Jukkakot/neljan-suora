import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cellAt, COLUMNS, ROWS, type Game } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { Position } from "../src/negamax/position.js";
import { loadOracle } from "./oracle.js";

/** `game` as a database line: column by column, bottom up; x moved first (seat 1 here). */
const lineOf = (game: Game, outcome: string) =>
  [...Array.from({ length: COLUMNS * ROWS }, (_, i) => ["b", "x", "o"][game.cells[cellAt(Math.floor(i / ROWS), i % ROWS)]!]), outcome].join(",");

describe("8-disc oracle", () => {
  it("reads a database line as the outcome for the side to move, mirror images included", () => {
    const won = gameAfter([3, 3, 3, 3, 2, 4, 4, 2]);
    const drawn = gameAfter([0, 1, 0, 1, 2, 3, 6, 5]);
    const file = join(mkdtempSync(join(tmpdir(), "oracle-")), "connect-4.data");
    writeFileSync(file, `${lineOf(won, "win")}\n${lineOf(drawn, "draw")}\n`);
    const oracle = loadOracle(file)!;
    expect(oracle.size).toBe(2);
    expect(oracle.outcome(Position.fromGame(won))).toBe(1);
    expect(oracle.outcome(Position.fromGame(gameAfter([3, 3, 3, 3, 4, 2, 2, 4])))).toBe(1);
    expect(oracle.outcome(Position.fromGame(drawn))).toBe(0);
    expect(oracle.outcome(Position.fromGame(gameAfter([3, 3, 3, 3, 2, 4, 4, 1])))).toBeUndefined();
  });

  it("is absent until downloaded", () => {
    expect(loadOracle(join(tmpdir(), "no-such-oracle.data"))).toBeUndefined();
  });
});
