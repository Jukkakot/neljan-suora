import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COLUMNS, ROWS } from "@neljan-suora/rules";
import { Position } from "../src/negamax/position.js";
import type { Oracle, Outcome } from "../src/perfect/solve.js";

/*
 * Pascal Pons' Connect 4 opening book (github.com/PascalPons/connect4, release "book", AGPL-3.0):
 * exact scores of positions with at most 14 discs, in his solver's hash-table file. Only the book
 * generator reads it, to stop its searches early; it is downloaded into `book/.cache/` (development →
 * Opening book) and never committed or shipped.
 *
 * File: width, height, max discs, partial key bytes, value bytes (1), log2 size; then `size` partial
 * keys and `size` values, `size` the smallest prime ≥ 2^log2. A position's key is Pons' `key3`: per
 * column bottom up 1 (side to move) or 2 (other side), ×3 after every column, the smaller of the
 * two column orders, ÷ 3. Slot `key % size` holds the key's low bytes; a value v ≠ 0 is the score
 * v − 19 for the side to move (positive wins). The slot and the low bytes together pin down every
 * key of up to 14 discs, so a hit is never another position; a miss (0) is a position the table lost.
 */
export const PONS_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "book", ".cache", "7x6.book");
const STRIDE = ROWS + 1;
const MIN_SCORE = -(COLUMNS * ROWS) / 2 + 3;

function nextPrime(n: number): number {
  for (let candidate = n; ; candidate++) {
    let prime = candidate > 1;
    for (let factor = 2; factor * factor <= candidate && prime; factor++) if (candidate % factor === 0) prime = false;
    if (prime) return candidate;
  }
}

/** The 7 columns' bits of `cur` and `mask`, column by column. */
function columnsOf(position: Position): { cur: number[]; mask: number[] } {
  const cur: number[] = [];
  const mask: number[] = [];
  for (let column = 0; column < COLUMNS; column++) {
    const shift = (column < 4 ? column : column - 4) * STRIDE;
    cur.push(((column < 4 ? position.curLo : position.curHi) >>> shift) & 0x7f);
    mask.push(((column < 4 ? position.maskLo : position.maskHi) >>> shift) & 0x7f);
  }
  return { cur, mask };
}

/** Pons' `key3` of the position. */
export function ponsKey(position: Position): number {
  const { cur, mask } = columnsOf(position);
  const keyIn = (order: readonly number[]) => {
    let key = 0;
    for (const column of order) {
      for (let bit = 1; mask[column]! & bit; bit <<= 1) key = key * 3 + (cur[column]! & bit ? 1 : 2);
      key *= 3;
    }
    return key;
  };
  const forward = keyIn([0, 1, 2, 3, 4, 5, 6]);
  const reverse = keyIn([6, 5, 4, 3, 2, 1, 0]);
  return Math.min(forward, reverse) / 3;
}

/** The book as an oracle for positions of up to its depth, or undefined when it has not been downloaded. */
export function loadPonsBook(file = PONS_FILE): (Oracle & { readonly depth: number; score(position: Position): number | undefined }) | undefined {
  if (!existsSync(file)) return undefined;
  const bytes = readFileSync(file);
  const [width, height, depth, keyBytes, valueBytes, logSize] = bytes.subarray(0, 6);
  if (width !== COLUMNS || height !== ROWS || valueBytes !== 1 || (keyBytes !== 1 && keyBytes !== 2 && keyBytes !== 4)) {
    throw new Error(`${file}: not a 7 × 6 opening book (header ${[...bytes.subarray(0, 6)].join(" ")})`);
  }
  const size = nextPrime(2 ** logSize!);
  if (bytes.length !== 6 + size * (keyBytes + 1)) throw new Error(`${file}: ${bytes.length} bytes, expected ${6 + size * (keyBytes + 1)}`);
  const keyAt = (slot: number) => bytes.readUIntLE(6 + slot * keyBytes, keyBytes);
  const values = bytes.subarray(6 + size * keyBytes);
  const keyModulo = 2 ** (8 * keyBytes);
  const score = (position: Position): number | undefined => {
    if (position.moves > depth!) return undefined;
    const key = ponsKey(position);
    const slot = key % size;
    if (keyAt(slot) !== key % keyModulo) return undefined;
    const value = values[slot]!;
    return value === 0 ? undefined : value + MIN_SCORE - 1;
  };
  return {
    discs: depth!,
    depth: depth!,
    score,
    outcome: (position) => {
      const known = score(position);
      return known === undefined ? undefined : (Math.sign(known) as Outcome);
    },
  };
}

/** Both oracles as one: Pons' book up to its depth, Tromp's database at 8 discs where the book misses. */
export function combineOracles(...oracles: readonly (Oracle | undefined)[]): Oracle | undefined {
  const present = oracles.filter((oracle): oracle is Oracle => oracle !== undefined);
  if (present.length === 0) return undefined;
  return {
    discs: Math.max(...present.map((oracle) => oracle.discs)),
    outcome: (position) => {
      for (const oracle of present) {
        if (position.moves > oracle.discs) continue;
        const known = oracle.outcome(position);
        if (known !== undefined) return known;
      }
      return undefined;
    },
  };
}
