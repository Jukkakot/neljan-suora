import { describe, expect, it } from "vitest";
import { gameAfter } from "@neljan-suora/rules/testing";
import { Position } from "../negamax/position.js";
import { Book, BOOK_VERSION, bookEntry, writeBook } from "./book.js";

const at = (columns: number[]) => Position.fromGame(gameAfter(columns));

describe("opening book", () => {
  it("round-trips its entries", () => {
    const buffer = writeBook(
      [bookEntry(at([]), 1, [3]), bookEntry(at([0]), 1, [3]), bookEntry(at([2, 3]), 0, [1, 2, 3]), bookEntry(at([3, 3, 3]), -1, [0, 1, 2, 3, 4, 5, 6])],
      1234,
    );
    const book = Book.parse(buffer)!;
    expect(book.size).toBe(4);
    expect(book.solveNodes).toBe(1234);
    expect(book.lookup(at([]))).toEqual({ outcome: 1, columns: [3] });
    expect(book.lookup(at([2, 3]))).toEqual({ outcome: 0, columns: [1, 2, 3] });
    expect(book.lookup(at([3, 3, 3]))).toEqual({ outcome: -1, columns: [0, 1, 2, 3, 4, 5, 6] });
    expect(book.lookup(at([1]))).toBeUndefined();
  });

  it("finds a mirrored position with mirrored columns", () => {
    const book = Book.parse(writeBook([bookEntry(at([0, 1]), 0, [2, 3])], 1))!;
    expect(book.lookup(at([6, 5]))).toEqual({ outcome: 0, columns: [3, 4] });
    expect(book.lookup(at([0, 1]))).toEqual({ outcome: 0, columns: [2, 3] });
  });

  it("stores a position and its mirror once", () => {
    const book = Book.parse(writeBook([bookEntry(at([0]), 1, [3]), bookEntry(at([6]), 1, [3])], 1))!;
    expect(book.size).toBe(1);
  });

  it("reads another version as no book", () => {
    const buffer = writeBook([bookEntry(at([]), 1, [3])], 1);
    new Uint32Array(buffer, 4, 1)[0] = BOOK_VERSION + 1;
    expect(Book.parse(buffer)).toBeUndefined();
    expect(Book.parse(new ArrayBuffer(8))).toBeUndefined();
  });
});
