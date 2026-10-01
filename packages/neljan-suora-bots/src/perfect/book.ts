import { COLUMNS, ROWS } from "@neljan-suora/rules";
import type { Position } from "../negamax/position.js";
import type { Outcome } from "./solve.js";

/*
 * The opening book: Pascal Pons' `7x6.book` (github.com/PascalPons/connect4, release "book",
 * AGPL-3.0), the exact scores of positions up to 14 discs from his Connect 4 solver, read as he
 * writes it (OpeningBook.hpp):
 *
 *   0  u8 width (7), u8 height (6), u8 depth (max discs), u8 partial key bytes (1, 2 or 4),
 *      u8 value bytes (1), u8 log2 size; size = the smallest prime ≥ 2^log2
 *   6  size partial keys (little-endian), then size values
 *
 * A position's key is Pons' `key3`: per column bottom up 1 (side to move) or 2 (the other side), ×3
 * after every column, the smaller of the two column orders (so mirror images share it), ÷ 3. Slot
 * `key % size` holds the key's low bytes and a value v: the score v − 19 for the side to move (> 0 a
 * win, the sooner the larger), 0 when empty. The slot and the low bytes together pin down every key
 * of the book's depth, so a hit is exact; positions the table lost read as unknown.
 */

const STRIDE = ROWS + 1;
const HEADER = 6;
const MIN_SCORE = -(COLUMNS * ROWS) / 2 + 3;

/** A book position's verdict: its outcome and the columns of its best score (soonest win, latest loss). */
export interface BookVerdict {
  readonly outcome: Outcome;
  readonly columns: readonly number[];
}

function nextPrime(n: number): number {
  for (let candidate = Math.max(2, n); ; candidate++) {
    let prime = true;
    for (let factor = 2; factor * factor <= candidate && prime; factor++) if (candidate % factor === 0) prime = false;
    if (prime) return candidate;
  }
}

/** Pons' `key3` of the position. */
export function bookKey(position: Position): number {
  const cur: number[] = [];
  const mask: number[] = [];
  for (let column = 0; column < COLUMNS; column++) {
    const shift = (column < 4 ? column : column - 4) * STRIDE;
    cur.push(((column < 4 ? position.curLo : position.curHi) >>> shift) & 0x7f);
    mask.push(((column < 4 ? position.maskLo : position.maskHi) >>> shift) & 0x7f);
  }
  const keyIn = (from: number, step: number) => {
    let key = 0;
    for (let column = from; column >= 0 && column < COLUMNS; column += step) {
      for (let bit = 1; mask[column]! & bit; bit <<= 1) key = key * 3 + (cur[column]! & bit ? 1 : 2);
      key *= 3;
    }
    return key;
  };
  return Math.min(keyIn(0, 1), keyIn(COLUMNS - 1, -1)) / 3;
}

export class Book {
  private readonly keys: DataView;
  private readonly values: Uint8Array;
  private readonly keyBytes: number;
  private readonly slots: number;
  /** The most discs of a stored position. */
  readonly depth: number;

  private constructor(buffer: ArrayBuffer, depth: number, keyBytes: number, slots: number) {
    this.keys = new DataView(buffer, HEADER, slots * keyBytes);
    this.values = new Uint8Array(buffer, HEADER + slots * keyBytes, slots);
    this.depth = depth;
    this.keyBytes = keyBytes;
    this.slots = slots;
  }

  /** The book in `buffer`, or undefined when it is not a 7 × 6 book in Pons' format. */
  static parse(buffer: ArrayBuffer): Book | undefined {
    if (buffer.byteLength < HEADER) return undefined;
    const [width, height, depth, keyBytes, valueBytes, logSize] = new Uint8Array(buffer, 0, HEADER) as unknown as number[];
    if (width !== COLUMNS || height !== ROWS || valueBytes !== 1 || ![1, 2, 4].includes(keyBytes!) || logSize! > 30) return undefined;
    const slots = nextPrime(2 ** logSize!);
    if (buffer.byteLength !== HEADER + slots * (keyBytes! + 1)) return undefined;
    return new Book(buffer, depth!, keyBytes!, slots);
  }

  /** The exact score of `position` for the side to move, or undefined when the book does not hold it. */
  score(position: Position): number | undefined {
    if (position.moves > this.depth) return undefined;
    const key = bookKey(position);
    const slot = key % this.slots;
    const offset = slot * this.keyBytes;
    const stored =
      this.keyBytes === 1 ? this.keys.getUint8(offset) : this.keyBytes === 2 ? this.keys.getUint16(offset, true) : this.keys.getUint32(offset, true);
    if (stored !== key % 2 ** (8 * this.keyBytes)) return undefined;
    const value = this.values[slot]!;
    return value === 0 ? undefined : value + MIN_SCORE - 1;
  }

  /**
   * The verdict for `position` (side to move, game not over), or undefined when the book cannot give
   * it: every column that wins at once, else the columns whose positions the book holds with the best
   * score, when that score is the position's own (or every column's position is held).
   */
  lookup(position: Position): BookVerdict | undefined {
    const legal = Array.from({ length: COLUMNS }, (_, column) => column).filter((column) => position.canPlay(column));
    const wins = legal.filter((column) => position.isWinningMove(column));
    if (wins.length > 0) return { outcome: 1, columns: wins };
    if (position.moves + 1 > this.depth) return undefined;
    let best = -Infinity;
    let columns: number[] = [];
    let missing = false;
    for (const column of legal) {
      position.play(column);
      const after = this.score(position);
      position.undo(column);
      if (after === undefined) {
        missing = true;
        continue;
      }
      if (-after > best) [best, columns] = [-after, [column]];
      else if (-after === best) columns.push(column);
    }
    if (columns.length === 0) return undefined;
    if (missing && this.score(position) !== best) return undefined;
    return { outcome: Math.sign(best) as Outcome, columns };
  }
}

/** A book file holding `scores` (position, score for the side to move), for tests: Pons' format, 2-byte keys. */
export function writeBook(scores: ReadonlyArray<readonly [Position, number]>, depth = 14, logSize = 10): ArrayBuffer {
  const slots = nextPrime(2 ** logSize);
  const buffer = new ArrayBuffer(HEADER + slots * 3);
  new Uint8Array(buffer, 0, HEADER).set([COLUMNS, ROWS, depth, 2, 1, logSize]);
  const keys = new DataView(buffer, HEADER, slots * 2);
  const values = new Uint8Array(buffer, HEADER + slots * 2, slots);
  const owners = new Map<number, number>();
  for (const [position, score] of scores) {
    const key = bookKey(position);
    const slot = key % slots;
    if (owners.has(slot) && owners.get(slot) !== key) throw new Error(`writeBook: two positions share slot ${slot}; use a larger logSize`);
    owners.set(slot, key);
    keys.setUint16(slot * 2, key % 65536, true);
    values[slot] = score - MIN_SCORE + 1;
  }
  return buffer;
}
