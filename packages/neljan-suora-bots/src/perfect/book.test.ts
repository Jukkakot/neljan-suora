import { describe, expect, it } from "vitest";
import { gameAfter } from "@neljan-suora/rules/testing";
import { Position } from "../negamax/position.js";
import { Book, bookKey, writeBook } from "./book.js";

const at = (columns: number[]) => Position.fromGame(gameAfter(columns));

describe("opening book", () => {
  it("keys a position like Pons' key3, mirror images alike", () => {
    expect(bookKey(at([]))).toBe(0);
    // One disc of the side that just moved (2) in column 0; the reverse column order is smaller.
    expect(bookKey(at([0]))).toBe(2);
    expect(bookKey(at([0]))).toBe(bookKey(at([6])));
    expect(bookKey(at([0, 1]))).toBe(bookKey(at([6, 5])));
  });

  it("reads scores for the side to move, mirror images included, misses as unknown", () => {
    const book = Book.parse(writeBook([[at([]), 1], [at([3]), -1], [at([0]), 2]]))!;
    expect(book.depth).toBe(14);
    expect(book.score(at([]))).toBe(1);
    expect(book.score(at([3]))).toBe(-1);
    expect(book.score(at([6]))).toBe(2);
    expect(book.score(at([2]))).toBeUndefined();
  });

  it("gives the columns of the best score, and nothing when a missing column could be better", () => {
    // Children's scores are for the other side: -3 there is the mover's soonest win. Mirror images
    // share a key, so a column and its mirror are held or missing together.
    const scores = [2, 1, 0, -3, 0, 1, 2];
    const children = (...skip: number[]) => scores.flatMap((score, column) => (skip.includes(column) ? [] : [[at([column]), score] as const]));
    const lookup = (entries: ReturnType<typeof children>) => Book.parse(writeBook(entries))!.lookup(at([]));
    expect(lookup(children())).toEqual({ outcome: 1, columns: [3] });
    expect(lookup(children(3))).toBeUndefined();
    expect(lookup([...children(1, 5), [at([]), 3]])).toEqual({ outcome: 1, columns: [3] });
    expect(lookup([...children(3), [at([]), 3]])).toBeUndefined();
  });

  it("answers an immediate win without the book and nothing past its depth", () => {
    const book = Book.parse(writeBook([], 2))!;
    expect(book.lookup(at([0, 1, 0, 1, 0, 1]))).toEqual({ outcome: 1, columns: [0] });
    expect(book.lookup(at([3, 3]))).toBeUndefined();
  });

  it("reads anything else as no book", () => {
    const buffer = writeBook([[at([]), 1]]);
    expect(Book.parse(buffer.slice(0, 100))).toBeUndefined();
    new Uint8Array(buffer)[0] = 8;
    expect(Book.parse(buffer)).toBeUndefined();
  });
});
