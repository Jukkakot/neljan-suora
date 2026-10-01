import { out, popcount, winningCells, type Position } from "./position.js";

/** Weights of the leaf rating; see `evaluatePosition`. */
export interface EvalWeights {
  /** The lowest winning cell of a column, on a row its side can claim by zugzwang. */
  readonly goodThreat: number;
  /** The lowest winning cell of a column, on the other parity. */
  readonly otherThreat: number;
  /** A winning cell above another winning cell of either side in its column. */
  readonly higherThreat: number;
  /** Multiplier of the cell-weight sums of the discs. */
  readonly material: number;
}

export const DEFAULT_WEIGHTS: EvalWeights = { goodThreat: 40, otherThreat: 12, higherThreat: 4, material: 1 };

const STRIDE = 7;
const COLUMN_BITS = 0x3f;

/** The 6 cells of `column` from a word pair, bit 0 = bottom. */
const columnOf = (lo: number, hi: number, column: number): number =>
  column < 4 ? (lo >>> (column * STRIDE)) & COLUMN_BITS : (hi >>> ((column - 4) * STRIDE)) & COLUMN_BITS;

/** Odd rows (from 1 at the bottom) within one column: heights 0, 2, 4. */
const ODD_COLUMN = 0x15;

/**
 * The threat score of side A minus side B. Per column, the lowest winning cell (of either side)
 * decides it: such a cell counts `goodThreat` when it lies on its side's parity (odd rows for the
 * side that moved first, even for the other), else `otherThreat`; every winning cell above the
 * column's lowest counts `higherThreat`.
 */
function threatBalance(aLo: number, aHi: number, bLo: number, bHi: number, aFirst: boolean, weights: EvalWeights): number {
  const aGood = aFirst ? ODD_COLUMN : ~ODD_COLUMN & COLUMN_BITS;
  let score = 0;
  for (let column = 0; column < 7; column++) {
    const a = columnOf(aLo, aHi, column);
    const b = columnOf(bLo, bHi, column);
    const both = a | b;
    if (both === 0) continue;
    const lowest = both & -both;
    if ((a & lowest) !== 0) score += (lowest & aGood) !== 0 ? weights.goodThreat : weights.otherThreat;
    if ((b & lowest) !== 0) score -= (lowest & ~aGood) !== 0 ? weights.goodThreat : weights.otherThreat;
    score += (popcount(a & ~lowest) - popcount(b & ~lowest)) * weights.higherThreat;
  }
  return score;
}

/**
 * Rates `position` for the side to move, at a search leaf: the winning cells (cells that would
 * complete four) of both sides by column, the lowest of each column counting most and more when it
 * lies on the row parity its side can claim at the end, plus the difference of the discs' cell
 * weights (cells on more lines of four are worth more, the centre most).
 */
export function evaluatePosition(position: Position, weights: EvalWeights = DEFAULT_WEIGHTS): number {
  const usFirst = position.moves % 2 === 0;
  winningCells(position.curLo, position.curHi, position.maskLo, position.maskHi);
  const oursLo = out.lo;
  const oursHi = out.hi;
  winningCells(position.curLo ^ position.maskLo, position.curHi ^ position.maskHi, position.maskLo, position.maskHi);
  const threats = threatBalance(oursLo, oursHi, out.lo, out.hi, usFirst, weights);
  const us = usFirst ? 0 : 1;
  const material = position.material[us]! - position.material[1 - us]!;
  return threats + material * weights.material;
}
