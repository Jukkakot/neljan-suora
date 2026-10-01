/*
 * Bitboards for the 7 × 6 grid. One seat's discs are the standard 7 × (6 + 1) layout: bit
 * `7·column + height` (height counted from the bottom), with an always-empty sentinel bit on top of
 * each column so shifts never wrap into the next column. The 49 bits do not fit JavaScript's 32-bit
 * bitwise operators, so a board is two words: `lo` holds columns 0–3 (28 bits), `hi` columns 4–6.
 */

export const COLUMNS = 7;
export const ROWS = 6;
export const CELLS = COLUMNS * ROWS;

/** Bits per column: the rows and the sentinel. */
const STRIDE = ROWS + 1;
/** Bits in `lo`: columns 0–3. */
const LO_BITS = 4 * STRIDE;
const LO_MASK = 2 ** LO_BITS - 1;

/** One seat's discs on the grid. */
export interface Bits {
  readonly lo: number;
  readonly hi: number;
}

/** The cell (row-major, top row first) of `column` at `height` from the bottom. */
export const cellAt = (column: number, height: number): number => (ROWS - 1 - height) * COLUMNS + column;

/** `seat`'s discs on `cells` (row-major, top row first) as a bitboard. */
export function bitsOf(cells: readonly number[], seat: number): Bits {
  let lo = 0;
  let hi = 0;
  for (let column = 0; column < COLUMNS; column++) {
    for (let height = 0; height < ROWS; height++) {
      if (cells[cellAt(column, height)] !== seat) continue;
      const bit = column * STRIDE + height;
      if (bit < LO_BITS) lo |= 1 << bit;
      else hi |= 1 << (bit - LO_BITS);
    }
  }
  return { lo: lo >>> 0, hi };
}

/** `lo` of the 49-bit value shifted right by `n` (n ≤ 28). */
const shiftLo = (lo: number, hi: number, n: number): number => ((lo >>> n) | (hi << (LO_BITS - n))) & LO_MASK;

/** Whether the board holds four in a row: up (1), across (7) or along a diagonal (6, 8). */
export function hasFour({ lo, hi }: Bits): boolean {
  for (const d of [1, STRIDE, STRIDE - 1, STRIDE + 1]) {
    const mLo = lo & shiftLo(lo, hi, d);
    const mHi = hi & (hi >>> d);
    if ((mLo & shiftLo(mLo, mHi, 2 * d)) !== 0 || (mHi & (mHi >>> (2 * d))) !== 0) return true;
  }
  return false;
}

/** Every line of four cells on the grid (69): across, up and both diagonals. */
export const LINES: readonly (readonly number[])[] = (() => {
  const lines: number[][] = [];
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      for (const [dr, dc] of directions) {
        const endRow = row + 3 * dr;
        const endColumn = column + 3 * dc;
        if (endRow >= ROWS || endColumn < 0 || endColumn >= COLUMNS) continue;
        lines.push([0, 1, 2, 3].map((i) => (row + i * dr) * COLUMNS + column + i * dc));
      }
    }
  }
  return lines;
})();
