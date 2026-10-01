import { COLUMNS, CELLS, ROWS } from "@neljan-suora/rules";
import { below, out, popcount, Position, winningCells } from "../negamax/position.js";

/** What the side to move gets under perfect play from both sides. */
export type Outcome = -1 | 0 | 1;

/** A position's best outcome and every column that reaches it. */
export interface RootVerdict {
  readonly outcome: Outcome;
  readonly columns: readonly number[];
}

export interface SolveLimits {
  /** Nodes the whole answer may search; the solve gives up beyond it. */
  readonly nodes?: number;
  /** Polled every `CHECK_EVERY` nodes; true gives up. */
  readonly expired?: () => boolean;
}

const STRIDE = ROWS + 1;
const CENTRE_RANK = [1, 3, 5, 6, 4, 2, 0];
const CHECK_EVERY = 1024;

/** Bit of `column`'s next cell inside its word. */
const cellBit = (position: Position, column: number): number => (column < 4 ? column : column - 4) * STRIDE + position.heights[column]!;
const inSet = (lo: number, hi: number, position: Position, column: number): boolean =>
  ((column < 4 ? lo : hi) & (1 << cellBit(position, column))) !== 0;

/**
 * A win/draw/loss solver on the game's bitboards: null-window negamax over the three outcomes, the
 * heuristic searcher's pre-search filters (immediate win, forced block, double threat, no disc under
 * the other side's winning cell), threats-then-centre move order and a typed-array table of bounds.
 * `solveRoot` clears the table first, so the same limits always give the same verdict; the book
 * generator keeps it between positions with `keepTable`.
 */
export class Solver {
  private readonly keys: Float64Array;
  private readonly bounds: Uint8Array;
  private readonly moves: Int8Array;
  private readonly shift: number;
  private readonly plyMoves = Array.from({ length: CELLS + 1 }, () => new Int8Array(COLUMNS));
  private readonly plyKeys = Array.from({ length: CELLS + 1 }, () => new Int32Array(COLUMNS));
  private position = new Position();
  private limit = Infinity;
  private expired: (() => boolean) | undefined;
  private aborted = false;
  /** Nodes searched by the last call. */
  nodes = 0;

  /** `tableBits`: log2 of the table's entries (default 21: about 21 MB); halved while refused. */
  constructor(tableBits = 21) {
    for (let bits = tableBits; ; bits--) {
      try {
        const size = 2 ** bits;
        this.keys = new Float64Array(size);
        this.bounds = new Uint8Array(size);
        this.moves = new Int8Array(size);
        this.shift = 32 - bits;
        break;
      } catch (error) {
        if (bits <= 12) throw error;
      }
    }
  }

  clear(): void {
    this.keys.fill(0);
  }

  /** The outcome of `position` for the side to move, or undefined when a limit ran out. */
  solve(position: Position, limits: SolveLimits = {}, keepTable = false): Outcome | undefined {
    this.start(position, limits, keepTable);
    const win = this.negamax(0, 1);
    if (this.aborted) return undefined;
    if (win > 0) return 1;
    const notLost = this.negamax(-1, 0);
    if (this.aborted) return undefined;
    return notLost > -1 ? 0 : -1;
  }

  /**
   * The best outcome of `position` (side to move, game not over, a column open) and every column
   * that reaches it, or undefined when a limit ran out. When a column wins at once, only the columns
   * that win at once.
   */
  solveRoot(position: Position, limits: SolveLimits = {}, keepTable = false): RootVerdict | undefined {
    this.start(position, limits, keepTable);
    const legal: number[] = [];
    for (const column of [3, 2, 4, 1, 5, 0, 6]) if (position.canPlay(column)) legal.push(column);
    const wins = legal.filter((column) => position.isWinningMove(column));
    if (wins.length > 0) return { outcome: 1, columns: wins };

    let outcome: Outcome = -1;
    let columns: number[] = [];
    for (const column of legal) {
      // Whether this column reaches at least `outcome` (and then whether it beats it).
      let value: Outcome = -1;
      if (outcome === 1) {
        if (this.atLeast(column, 1)) value = 1;
      } else if (outcome === 0) {
        if (this.atLeast(column, 0)) value = this.atLeast(column, 1) ? 1 : 0;
      } else if (this.atLeast(column, 0)) value = this.atLeast(column, 1) ? 1 : 0;
      if (this.aborted) return undefined;
      if (value > outcome) {
        outcome = value;
        columns = [column];
      } else if (value === outcome) columns.push(column);
    }
    return { outcome, columns: columns.sort((a, b) => a - b) };
  }

  private start(position: Position, limits: SolveLimits, keepTable: boolean): void {
    if (!keepTable) this.clear();
    this.position = position;
    this.limit = limits.nodes ?? Infinity;
    this.expired = limits.expired;
    this.aborted = false;
    this.nodes = 0;
  }

  /** Whether the side to move reaches at least `target` by dropping into `column`. */
  private atLeast(column: number, target: Outcome): boolean {
    this.position.play(column);
    // The other side's value is at most -target.
    const value = this.negamax(-target, -target + 1);
    this.position.undo(column);
    return value <= -target;
  }

  private index(key: number): number {
    const lo = key % 2 ** 28;
    const hi = (key - lo) / 2 ** 28;
    return Math.imul(lo ^ Math.imul(hi, 0x9e3779b1), 0x85ebca6b) >>> this.shift;
  }

  /** Fail-soft negamax on outcomes inside the window (alpha, beta). */
  private negamax(alpha: number, beta: number): number {
    if (++this.nodes > this.limit || (this.nodes % CHECK_EVERY === 0 && this.expired?.())) this.aborted = true;
    if (this.aborted) return 0;
    const position = this.position;
    if (position.moves === CELLS) return 0;
    const { curLo, curHi, maskLo, maskHi } = position;
    position.possible();
    let possLo = out.lo;
    let possHi = out.hi;
    winningCells(curLo, curHi, maskLo, maskHi);
    if ((out.lo & possLo) !== 0 || (out.hi & possHi) !== 0) return 1;
    winningCells(curLo ^ maskLo, curHi ^ maskHi, maskLo, maskHi);
    const oppLo = out.lo;
    const oppHi = out.hi;
    const forcedLo = possLo & oppLo;
    const forcedHi = possHi & oppHi;
    if (forcedLo !== 0 || forcedHi !== 0) {
      if (popcount(forcedLo) + popcount(forcedHi) > 1) return -1;
      possLo = forcedLo;
      possHi = forcedHi;
    }
    below(oppLo, oppHi);
    possLo &= ~out.lo;
    possHi &= ~out.hi;
    if (possLo === 0 && possHi === 0) return -1;
    // Two cells or fewer left and a safe disc to drop: nobody can win any more.
    if (position.moves >= CELLS - 2) return 0;

    const key = position.key();
    const slot = this.index(key);
    let lower = -1;
    let upper = 1;
    let ttMove = -1;
    if (this.keys[slot] === key + 1) {
      const packed = this.bounds[slot]!;
      lower = Math.floor(packed / 3) - 1;
      upper = (packed % 3) - 1;
      ttMove = this.moves[slot]!;
      if (lower >= beta) return lower;
      if (upper <= alpha) return upper;
      if (lower > alpha) alpha = lower;
      if (upper < beta) beta = upper;
      if (alpha >= beta) return alpha;
    }

    const moves = this.plyMoves[position.moves]!;
    const keys = this.plyKeys[position.moves]!;
    let count = 0;
    for (let column = 0; column < COLUMNS; column++) {
      if (!position.canPlay(column) || !inSet(possLo, possHi, position, column)) continue;
      const sortKey = column === ttMove ? 1 << 20 : threatsAfter(position, column) * 8 + CENTRE_RANK[column]!;
      let i = count++;
      while (i > 0 && keys[i - 1]! < sortKey) {
        keys[i] = keys[i - 1]!;
        moves[i] = moves[i - 1]!;
        i--;
      }
      keys[i] = sortKey;
      moves[i] = column;
    }

    const alphaStart = alpha;
    let value = -2;
    let bestMove = moves[0]!;
    for (let i = 0; i < count; i++) {
      const column = moves[i]!;
      position.play(column);
      const score = -this.negamax(-beta, -alpha);
      position.undo(column);
      if (this.aborted) return 0;
      if (score > value) {
        value = score;
        bestMove = column;
      }
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }

    // Merge what this search proved into the stored bounds (both are facts, so lower ≤ upper), packed
    // in a byte as (lower + 1) · 3 + (upper + 1).
    if (value <= alphaStart) upper = Math.min(upper, value);
    else if (value >= beta) lower = Math.max(lower, value);
    else lower = upper = value;
    this.keys[slot] = key + 1;
    this.bounds[slot] = (lower + 1) * 3 + (upper + 1);
    this.moves[slot] = bestMove;
    return value;
  }
}

/** The winning cells the side to move has after dropping into `column`. */
function threatsAfter(position: Position, column: number): number {
  position.play(column);
  winningCells(position.curLo ^ position.maskLo, position.curHi ^ position.maskHi, position.maskLo, position.maskHi);
  const threats = popcount(out.lo) + popcount(out.hi);
  position.undo(column);
  return threats;
}
