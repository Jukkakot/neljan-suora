import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gameAfter } from "@neljan-suora/rules/testing";
import { Position } from "../src/negamax/position.js";
import { combineOracles, loadPonsBook, ponsKey } from "./pons-book.js";

const positionAfter = (line: number[]) => Position.fromGame(gameAfter(line));

/** A book file in Pons' format: 2^4 → 17 slots, 2-byte partial keys, scores for the side to move. */
function bookWith(scores: ReadonlyArray<readonly [number[], number]>, depth = 14): string {
  const size = 17;
  const bytes = Buffer.alloc(6 + size * 3);
  bytes.set([7, 6, depth, 2, 1, 4]);
  for (const [line, score] of scores) {
    const key = ponsKey(positionAfter(line));
    bytes.writeUInt16LE(key % 65536, 6 + (key % size) * 2);
    bytes[6 + size * 2 + (key % size)] = score + 19;
  }
  const file = join(mkdtempSync(join(tmpdir(), "pons-")), "7x6.book");
  writeFileSync(file, bytes);
  return file;
}

describe("Pons' opening book", () => {
  it("keys a position like Pons' key3: base 3 per column, the smaller order, ÷ 3", () => {
    expect(ponsKey(positionAfter([]))).toBe(0);
    // One disc of the side that just moved (2) in column 0: the reverse order is smaller.
    expect(ponsKey(positionAfter([0]))).toBe(2);
    expect(ponsKey(positionAfter([0]))).toBe(ponsKey(positionAfter([6])));
  });

  it("reads scores for the side to move, mirror images included, and misses as unknown", () => {
    const pons = loadPonsBook(bookWith([[[], 1], [[3], -1], [[0], 2]]))!;
    expect(pons.score(positionAfter([]))).toBe(1);
    expect(pons.outcome(positionAfter([3]))).toBe(-1);
    expect(pons.outcome(positionAfter([6]))).toBe(1);
    expect(pons.outcome(positionAfter([2]))).toBeUndefined();
  });

  it("knows nothing past its depth and is absent until downloaded", () => {
    const pons = loadPonsBook(bookWith([[[3, 3], 1]], 1))!;
    expect(pons.outcome(positionAfter([3, 3]))).toBeUndefined();
    expect(loadPonsBook(join(tmpdir(), "no-such-book.book"))).toBeUndefined();
  });

  it("combines with another oracle that answers where the book misses", () => {
    const pons = loadPonsBook(bookWith([[[3], -1]]))!;
    const other = { discs: 8, outcome: () => 0 as const };
    const both = combineOracles(pons, other)!;
    expect(both.discs).toBe(14);
    expect(both.outcome(positionAfter([3]))).toBe(-1);
    expect(both.outcome(positionAfter([2]))).toBe(0);
    expect(combineOracles(undefined, undefined)).toBeUndefined();
  });
});
