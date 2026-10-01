import { COLUMNS, ROWS } from "@neljan-suora/rules";
import type { Position } from "../negamax/position.js";
import type { Outcome } from "./solve.js";

/*
 * The opening book: positions the browser cannot settle in its budget, each with its outcome for the
 * side to move and the mask of the columns that reach it. A position and its mirror image share one
 * entry under the smaller of their two keys. File layout (little-endian):
 *
 *   0  "NSB1"            magic
 *   4  u32 version       BOOK_VERSION; another version reads as no book
 *   8  u32 solve nodes   the node limit the book was made for
 *  12  u32 count         entries
 *  16  u32[count]        keys' high words, sorted by (high, low)
 *      u32[count]        keys' low words
 *      u16[count]        data: bits 0–6 the column mask, bits 7–8 the outcome + 1
 */

export const BOOK_VERSION = 1;
const MAGIC = 0x3142534e; // "NSB1" read as a little-endian u32
const HEADER = 16;
const STRIDE = ROWS + 1;
const TWO_32 = 2 ** 32;

/** A book position's verdict, mirrored back to the position asked about. */
export interface BookVerdict {
  readonly outcome: Outcome;
  readonly columns: readonly number[];
}

/** The book's key of `position` and whether it is its mirror image's key. */
export function canonicalKey(position: Position): { key: number; mirrored: boolean } {
  const key = position.key();
  let mirror = 0;
  for (let column = 0; column < COLUMNS; column++) {
    const chunk = Math.floor(key / 2 ** (STRIDE * column)) % 2 ** STRIDE;
    mirror += chunk * 2 ** (STRIDE * (COLUMNS - 1 - column));
  }
  return mirror < key ? { key: mirror, mirrored: true } : { key, mirrored: false };
}

const mirrorMask = (mask: number): number => {
  let mirrored = 0;
  for (let column = 0; column < COLUMNS; column++) if (mask & (1 << column)) mirrored |= 1 << (COLUMNS - 1 - column);
  return mirrored;
};

const columnsOf = (mask: number): number[] => Array.from({ length: COLUMNS }, (_, column) => column).filter((column) => mask & (1 << column));

export class Book {
  private readonly high: Uint32Array;
  private readonly low: Uint32Array;
  private readonly data: Uint16Array;
  /** The node limit the book was made for. */
  readonly solveNodes: number;

  private constructor(high: Uint32Array, low: Uint32Array, data: Uint16Array, solveNodes: number) {
    this.high = high;
    this.low = low;
    this.data = data;
    this.solveNodes = solveNodes;
  }

  /** The book in `buffer`, or undefined when it is not a book of this version. */
  static parse(buffer: ArrayBuffer): Book | undefined {
    if (buffer.byteLength < HEADER) return undefined;
    const [magic, version, solveNodes, count] = new Uint32Array(buffer, 0, 4) as unknown as [number, number, number, number];
    if (magic !== MAGIC || version !== BOOK_VERSION) return undefined;
    if (buffer.byteLength < HEADER + count * 10) return undefined;
    return new Book(
      new Uint32Array(buffer, HEADER, count),
      new Uint32Array(buffer, HEADER + 4 * count, count),
      new Uint16Array(buffer, HEADER + 8 * count, count),
      solveNodes,
    );
  }

  get size(): number {
    return this.high.length;
  }

  /** The verdict for `position` (side to move), or undefined when it is not in the book. */
  lookup(position: Position): BookVerdict | undefined {
    const { key, mirrored } = canonicalKey(position);
    const high = Math.floor(key / TWO_32);
    const low = key % TWO_32;
    let from = 0;
    let to = this.high.length - 1;
    while (from <= to) {
      const middle = (from + to) >>> 1;
      const h = this.high[middle]!;
      const l = this.low[middle]!;
      if (h === high && l === low) {
        const entry = this.data[middle]!;
        const mask = entry & 0x7f;
        return { outcome: ((entry >>> 7) - 1) as Outcome, columns: columnsOf(mirrored ? mirrorMask(mask) : mask) };
      }
      if (h < high || (h === high && l < low)) from = middle + 1;
      else to = middle - 1;
    }
    return undefined;
  }
}

/** An entry to write: the position's verdict as solved (not yet canonical). */
export interface BookEntry {
  readonly key: number;
  readonly mirrored: boolean;
  readonly outcome: Outcome;
  readonly columns: readonly number[];
}

/** A book entry for `position` with its verdict. */
export function bookEntry(position: Position, outcome: Outcome, columns: readonly number[]): BookEntry {
  return { ...canonicalKey(position), outcome, columns };
}

/** The book file of `entries` (duplicates by key keep the first). */
export function writeBook(entries: readonly BookEntry[], solveNodes: number): ArrayBuffer {
  const unique = new Map<number, BookEntry>();
  for (const entry of entries) if (!unique.has(entry.key)) unique.set(entry.key, entry);
  const sorted = [...unique.values()].sort((a, b) => a.key - b.key);
  const count = sorted.length;
  const buffer = new ArrayBuffer(HEADER + count * 10 + ((count * 2) % 4));
  new Uint32Array(buffer, 0, 4).set([MAGIC, BOOK_VERSION, solveNodes, count]);
  const high = new Uint32Array(buffer, HEADER, count);
  const low = new Uint32Array(buffer, HEADER + 4 * count, count);
  const data = new Uint16Array(buffer, HEADER + 8 * count, count);
  sorted.forEach((entry, i) => {
    high[i] = Math.floor(entry.key / TWO_32);
    low[i] = entry.key % TWO_32;
    let mask = 0;
    for (const column of entry.columns) mask |= 1 << column;
    data[i] = (entry.mirrored ? mirrorMask(mask) : mask) | ((entry.outcome + 1) << 7);
  });
  return buffer;
}
