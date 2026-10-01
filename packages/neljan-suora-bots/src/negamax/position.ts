import { cellAt, COLUMNS, ROWS, type Game } from "@neljan-suora/rules";

/*
 * The searcher's position: the rules' bitboard layout (bit `7·column + height`, a sentinel bit on top
 * of each column) as two words, `lo` = columns 0–3 (28 bits) and `hi` = columns 4–6 (21 bits), so
 * every operation stays inside JavaScript's 32-bit bitwise operators. Shifts across the two words
 * behave exactly like shifts of the 49-bit value. `cur` holds the discs of the side to move, `mask`
 * every disc. Played and taken back in place: the search allocates nothing.
 */

const STRIDE = ROWS + 1;
const LO_BITS = 4 * STRIDE;
const LO_MASK = 2 ** LO_BITS - 1;
const HI_MASK = 2 ** (3 * STRIDE) - 1;

/** `n` copies of a column pattern, one per column of a word. */
const perColumn = (pattern: number, columns: number): number => {
  let word = 0;
  for (let c = 0; c < columns; c++) word |= pattern << (c * STRIDE);
  return word;
};

/** The playable cells (all but the sentinels). */
export const BOARD_LO = perColumn(0x3f, 4);
export const BOARD_HI = perColumn(0x3f, 3);
/** The bottom cell of each column. */
const BOTTOM_LO = perColumn(1, 4);
const BOTTOM_HI = perColumn(1, 3);
const shlLo = (lo: number, n: number): number => (lo << n) & LO_MASK;
const shlHi = (lo: number, hi: number, n: number): number => ((hi << n) | (lo >>> (LO_BITS - n))) & HI_MASK;
const shrLo = (lo: number, hi: number, n: number): number => ((lo >>> n) | (hi << (LO_BITS - n))) & LO_MASK;
const shrHi = (hi: number, n: number): number => hi >>> n;

/** Set bits in a 32-bit word. */
export function popcount(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24) & 0xff;
}

/** Result words of `winningCells` (module scratch, so the search allocates nothing). */
export const out = { lo: 0, hi: 0 };

/**
 * The empty cells (playable now or later) that would complete four for the discs `p` on the board
 * `m`; written to `out`.
 */
export function winningCells(pLo: number, pHi: number, mLo: number, mHi: number): void {
  // Up: three below.
  let rLo = shlLo(pLo, 1) & shlLo(pLo, 2) & shlLo(pLo, 3);
  let rHi = shlHi(pLo, pHi, 1) & shlHi(pLo, pHi, 2) & shlHi(pLo, pHi, 3);
  // Across (7) and the diagonals (6, 8): three on one side, or two on one side and one on the other.
  for (let d = STRIDE - 1; d <= STRIDE + 1; d++) {
    let aLo = shlLo(pLo, d) & shlLo(pLo, 2 * d);
    let aHi = shlHi(pLo, pHi, d) & shlHi(pLo, pHi, 2 * d);
    rLo |= (aLo & shlLo(pLo, 3 * d)) | (aLo & shrLo(pLo, pHi, d));
    rHi |= (aHi & shlHi(pLo, pHi, 3 * d)) | (aHi & shrHi(pHi, d));
    aLo = shrLo(pLo, pHi, d) & shrLo(pLo, pHi, 2 * d);
    aHi = shrHi(pHi, d) & shrHi(pHi, 2 * d);
    rLo |= (aLo & shrLo(pLo, pHi, 3 * d)) | (aLo & shlLo(pLo, d));
    rHi |= (aHi & shrHi(pHi, 3 * d)) | (aHi & shlHi(pLo, pHi, d));
  }
  out.lo = rLo & BOARD_LO & ~mLo;
  out.hi = rHi & BOARD_HI & ~mHi;
}

/** Cells below `lo`/`hi` (the 49-bit value shifted down by one), written to `out`. */
export function below(lo: number, hi: number): void {
  out.lo = shrLo(lo, hi, 1);
  out.hi = shrHi(hi, 1);
}

/** How many lines of four pass through each cell, by `7·column + height`: a cheap positional weight. */
const LINE_COUNTS = [3, 4, 5, 5, 4, 3];
const COLUMN_FACTORS = [3, 4, 5, 7, 5, 4, 3];
export const CELL_WEIGHT: readonly number[] = Array.from({ length: COLUMNS * STRIDE }, (_, bit) => {
  const column = Math.floor(bit / STRIDE);
  const height = bit % STRIDE;
  if (height === ROWS) return 0;
  // The classic 3·4·5·7·5·4·3 table scaled by the row's line count.
  return Math.round((COLUMN_FACTORS[column]! * LINE_COUNTS[height]!) / 3);
});

export class Position {
  curLo = 0;
  curHi = 0;
  maskLo = 0;
  maskHi = 0;
  /** Discs on the board. */
  moves = 0;
  /** Discs in each column. */
  readonly heights = new Int8Array(COLUMNS);
  /** The cell weights of the first and the second side's discs (the side that moved first is 0). */
  readonly material = new Int32Array(2);

  /** The position of `game` with the seat on turn to move. */
  static fromGame(game: Game): Position {
    const position = new Position();
    let toMoveMaterial = 0;
    let total = 0;
    for (let column = 0; column < COLUMNS; column++) {
      for (let height = 0; height < ROWS; height++) {
        const owner = game.cells[cellAt(column, height)]!;
        if (owner === 0) continue;
        position.heights[column] = height + 1;
        const bit = column * STRIDE + height;
        const weight = CELL_WEIGHT[bit]!;
        total += weight;
        if (owner === game.turn) toMoveMaterial += weight;
        if (column < 4) {
          position.maskLo |= 1 << bit;
          if (owner === game.turn) position.curLo |= 1 << bit;
        } else {
          position.maskHi |= 1 << (bit - LO_BITS);
          if (owner === game.turn) position.curHi |= 1 << (bit - LO_BITS);
        }
        position.moves++;
      }
    }
    // The side to move moved first when an even number of discs is down.
    const toMove = position.moves % 2;
    position.material[toMove] = toMoveMaterial;
    position.material[1 - toMove] = total - toMoveMaterial;
    return position;
  }

  /** Whether `column` has room. */
  canPlay(column: number): boolean {
    return this.heights[column]! < ROWS;
  }

  /** The side to move drops into `column` (which has room); the other side is then to move. */
  play(column: number): void {
    const bit = column * STRIDE + this.heights[column]!;
    this.material[this.moves % 2]! += CELL_WEIGHT[bit]!;
    this.curLo ^= this.maskLo;
    this.curHi ^= this.maskHi;
    if (column < 4) this.maskLo |= 1 << bit;
    else this.maskHi |= 1 << (bit - LO_BITS);
    this.heights[column]!++;
    this.moves++;
  }

  /** Takes back the last disc, dropped into `column`. */
  undo(column: number): void {
    this.moves--;
    const height = --this.heights[column]!;
    const bit = column * STRIDE + height;
    if (column < 4) this.maskLo &= ~(1 << bit);
    else this.maskHi &= ~(1 << (bit - LO_BITS));
    this.curLo ^= this.maskLo;
    this.curHi ^= this.maskHi;
    this.material[this.moves % 2]! -= CELL_WEIGHT[bit]!;
  }

  /** The cell a disc dropped into each open column lands in, as words; written to `out`. */
  possible(): void {
    out.lo = (this.maskLo + BOTTOM_LO) & BOARD_LO;
    out.hi = (this.maskHi + BOTTOM_HI) & BOARD_HI;
  }

  /** Whether dropping into `column` (which has room) completes four for the side to move. */
  isWinningMove(column: number): boolean {
    winningCells(this.curLo, this.curHi, this.maskLo, this.maskHi);
    const bit = column * STRIDE + this.heights[column]!;
    return column < 4 ? (out.lo & (1 << bit)) !== 0 : (out.hi & (1 << (bit - LO_BITS))) !== 0;
  }

  /** A unique key of the position: `cur + mask` never carries out of a column. */
  key(): number {
    return this.curLo + this.maskLo + (this.curHi + this.maskHi) * 2 ** LO_BITS;
  }
}
