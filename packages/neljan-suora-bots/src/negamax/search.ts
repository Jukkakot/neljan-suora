import { checkBudget, deadline, systemClock, type Bot, type Budget, type Clock } from "@game-kit/bots";
import { COLUMNS, CELLS, ROWS, type Game, type Rng } from "@neljan-suora/rules";
import { DEFAULT_WEIGHTS, evaluatePosition, type EvalWeights } from "./evaluation.js";
import { below, out, popcount, Position, winningCells } from "./position.js";

/** A win on the next disc scores `WIN - 1`, a win `n` plies ahead `WIN - n`: shorter wins first. */
export const WIN = 10_000;
/** Scores beyond this are proven wins or losses. */
const PROVEN = WIN - 100;
const INFINITY = 2 * WIN;
/** Columns centre first: the order of last resort. */
const CENTRE_ORDER = [3, 2, 4, 1, 5, 0, 6];
const CENTRE_RANK = [1, 3, 5, 6, 4, 2, 0];
/** Nodes between deadline checks. */
const CHECK_EVERY = 1024;
const STRIDE = ROWS + 1;

const EXACT = 1;
const LOWER = 2;
const UPPER = 3;

export interface NegamaxOptions {
  /** Clock for the time budget; defaults to the platform clock. */
  readonly now?: Clock;
  /** log2 of the transposition table's entries (default 20: about 12 MB). */
  readonly tableBits?: number;
  /** Depth used when the budget has neither a depth nor a time limit. */
  readonly defaultDepth?: number;
  readonly weights?: EvalWeights;
  /** Told the deepest depth finished and the nodes searched for each answer (benchmarks). */
  readonly report?: (info: { readonly depth: number; readonly nodes: number; readonly score: number }) => void;
}

/** The searcher as a bot, and with its root limited to some columns (the perfect bot's best ones). */
export interface NegamaxBot extends Bot<Game, number> {
  /** As `choose`, searching only `candidates` (open columns) at the root; all open columns when omitted. */
  chooseAmong(game: Game, budget: Budget, rng: Rng, candidates?: readonly number[]): number | undefined;
}

/** The transposition table: typed arrays, allocated on the first search. */
class Table {
  readonly keys: Float64Array;
  readonly scores: Int16Array;
  readonly depths: Uint8Array;
  readonly flags: Uint8Array;
  readonly moves: Int8Array;
  readonly shift: number;

  constructor(bits: number) {
    const size = 2 ** bits;
    this.keys = new Float64Array(size);
    this.scores = new Int16Array(size);
    this.depths = new Uint8Array(size);
    this.flags = new Uint8Array(size);
    this.moves = new Int8Array(size);
    this.shift = 32 - bits;
  }

  index(key: number): number {
    const lo = key % 2 ** 28;
    const hi = (key - lo) / 2 ** 28;
    return Math.imul(lo ^ Math.imul(hi, 0x9e3779b1), 0x85ebca6b) >>> this.shift;
  }
}

/** Allocates the table, halving it while the platform refuses the memory. */
function allocate(bits: number): Table {
  for (let b = bits; ; b--) {
    try {
      return new Table(b);
    } catch (error) {
      if (b <= 12) throw error;
    }
  }
}

/** A proven score as stored (relative to the node) and back (relative to the root). */
const toTable = (score: number, ply: number): number => (score > PROVEN ? score + ply : score < -PROVEN ? score - ply : score);
const fromTable = (score: number, ply: number): number => (score > PROVEN ? score - ply : score < -PROVEN ? score + ply : score);

/** Bit of `column`'s next cell inside its word. */
const cellBit = (position: Position, column: number): number => (column < 4 ? column : column - 4) * STRIDE + position.heights[column]!;
const inSet = (lo: number, hi: number, position: Position, column: number): boolean =>
  ((column < 4 ? lo : hi) & (1 << cellBit(position, column))) !== 0;

/**
 * Negamax with alpha-beta on the game's bitboards: win-in-n scores, immediate wins and forced blocks
 * found before searching, no disc under the other side's winning cell while a safe column exists,
 * a transposition table, threats-then-centre move order and iterative deepening within the budget.
 * The table is cleared for every answer, so a depth budget and a seed always give the same column.
 */
export function negamaxBot(options: NegamaxOptions = {}): NegamaxBot {
  const now = options.now ?? systemClock;
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const defaultDepth = options.defaultDepth ?? 8;
  let table: Table | undefined;

  const bot: NegamaxBot = {
    choose: (game, budget, rng) => bot.chooseAmong(game, budget, rng),

    chooseAmong(game: Game, budget: Budget, rng: Rng, candidates?: readonly number[]): number | undefined {
      checkBudget(budget);
      if (game.over) return undefined;
      const position = Position.fromGame(game);
      const legal = CENTRE_ORDER.filter((column) => position.canPlay(column) && (candidates?.includes(column) ?? true));
      if (legal.length === 0) return undefined;
      if (legal.length === 1) return legal[0];

      const report = (depth: number, nodes: number, score: number) => options.report?.({ depth, nodes, score });
      const wins = legal.filter((column) => position.isWinningMove(column));
      if (wins.length > 0) {
        report(1, 0, WIN - 1);
        return pick(wins, rng);
      }

      // Root moves: the forced block if there is one, then the columns that do not give a win away.
      winningCells(position.curLo ^ position.maskLo, position.curHi ^ position.maskHi, position.maskLo, position.maskHi);
      const theirLo = out.lo;
      const theirHi = out.hi;
      let roots = legal.filter((column) => inSet(theirLo, theirHi, position, column));
      if (roots.length === 0) roots = legal;
      below(theirLo, theirHi);
      const underLo = out.lo;
      const underHi = out.hi;
      const safe = roots.filter((column) => !inSet(underLo, underHi, position, column));
      if (safe.length > 0) roots = safe;
      if (roots.length === 1) {
        report(1, 0, 0);
        return roots[0];
      }

      table ??= allocate(options.tableBits ?? 20);
      const tt = table;
      tt.keys.fill(0);
      const expired = deadline(budget, now);
      const maxDepth = Math.min(budget.depth ?? (budget.timeMs === undefined ? defaultDepth : CELLS), CELLS - position.moves);
      let nodes = 0;
      let aborted = false;
      // Per-ply move lists, so recursion does not allocate.
      const plyMoves = Array.from({ length: CELLS + 1 }, () => new Int8Array(COLUMNS));
      const plyKeys = Array.from({ length: CELLS + 1 }, () => new Int32Array(COLUMNS));

      const negamax = (alpha: number, beta: number, depth: number, ply: number): number => {
        if (++nodes % CHECK_EVERY === 0 && expired()) aborted = true;
        if (aborted) return 0;
        if (position.moves === CELLS) return 0;
        const { curLo, curHi, maskLo, maskHi } = position;
        position.possible();
        let possLo = out.lo;
        let possHi = out.hi;
        winningCells(curLo, curHi, maskLo, maskHi);
        if ((out.lo & possLo) !== 0 || (out.hi & possHi) !== 0) return WIN - ply - 1;
        winningCells(curLo ^ maskLo, curHi ^ maskHi, maskLo, maskHi);
        const oppLo = out.lo;
        const oppHi = out.hi;
        const forcedLo = possLo & oppLo;
        const forcedHi = possHi & oppHi;
        if (forcedLo !== 0 || forcedHi !== 0) {
          if (popcount(forcedLo) + popcount(forcedHi) > 1) return -(WIN - ply - 2);
          possLo = forcedLo;
          possHi = forcedHi;
        }
        below(oppLo, oppHi);
        possLo &= ~out.lo;
        possHi &= ~out.hi;
        if (possLo === 0 && possHi === 0) return -(WIN - ply - 2);
        if (depth <= 0) return evaluatePosition(position, weights);

        // No win before our next-but-one disc.
        const best = WIN - ply - 3;
        if (beta > best) {
          beta = best;
          if (alpha >= beta) return beta;
        }

        const key = position.key();
        const slot = tt.index(key);
        let ttMove = -1;
        if (tt.keys[slot] === key + 1) {
          ttMove = tt.moves[slot]!;
          if (tt.depths[slot]! >= depth) {
            const score = fromTable(tt.scores[slot]!, ply);
            const flag = tt.flags[slot]!;
            if (flag === EXACT) return score;
            if (flag === LOWER && score > alpha) alpha = score;
            else if (flag === UPPER && score < beta) beta = score;
            if (alpha >= beta) return score;
          }
        }

        const moves = plyMoves[ply]!;
        const keys = plyKeys[ply]!;
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
        let value = -INFINITY;
        let bestMove = moves[0]!;
        // A forced reply costs no depth: forcing lines are searched to their end.
        const childDepth = count === 1 ? depth : depth - 1;
        for (let i = 0; i < count; i++) {
          const column = moves[i]!;
          position.play(column);
          const score = -negamax(-beta, -alpha, childDepth, ply + 1);
          position.undo(column);
          if (aborted) return 0;
          if (score > value) {
            value = score;
            bestMove = column;
          }
          if (value > alpha) alpha = value;
          if (alpha >= beta) break;
        }

        tt.keys[slot] = key + 1;
        tt.scores[slot] = toTable(value, ply);
        tt.depths[slot] = depth;
        tt.flags[slot] = value <= alphaStart ? UPPER : value >= beta ? LOWER : EXACT;
        tt.moves[slot] = bestMove;
        return value;
      };

      // Root order: threats made, then centre; later depths by the last depth's scores.
      const rootKeys = new Map(roots.map((column) => [column, threatsAfter(position, column) * 8 + CENTRE_RANK[column]!]));
      let rootOrder = [...roots].sort((a, b) => rootKeys.get(b)! - rootKeys.get(a)!);

      let answer = [rootOrder[0]!];
      let answerScore = 0;
      let finished = 0;
      for (let depth = 1; depth <= maxDepth; depth++) {
        const scores = new Map<number, number>();
        let bestScore = -INFINITY;
        let ties: number[] = [];
        for (const column of rootOrder) {
          position.play(column);
          // A window just below the best so far: a score equal to it comes back exact (a tie).
          const score = -negamax(-INFINITY, -(bestScore - 1), depth - 1, 1);
          position.undo(column);
          if (aborted) break;
          scores.set(column, score);
          if (score > bestScore) {
            bestScore = score;
            ties = [column];
          } else if (score === bestScore) ties.push(column);
        }
        if (aborted) {
          // A move searched completely at this depth that beats the previous best (searched first) wins.
          const first = scores.get(rootOrder[0]!);
          if (first !== undefined && bestScore > first) {
            answer = ties;
            answerScore = bestScore;
          }
          break;
        }
        answer = ties;
        answerScore = bestScore;
        finished = depth;
        if (Math.abs(bestScore) > PROVEN) break;
        rootOrder = [...rootOrder].sort((a, b) => scores.get(b)! - scores.get(a)!);
      }
      report(finished, nodes, answerScore);
      return pick(answer, rng);
    },
  };
  return bot;
}

/** The winning cells the side to move has after dropping into `column`. */
function threatsAfter(position: Position, column: number): number {
  position.play(column);
  // Our discs are now the other side's in the position.
  winningCells(position.curLo ^ position.maskLo, position.curHi ^ position.maskHi, position.maskLo, position.maskHi);
  const threats = popcount(out.lo) + popcount(out.hi);
  position.undo(column);
  return threats;
}

/** One of `columns`: the only one, or one drawn by `rng`. */
function pick(columns: readonly number[], rng: Rng): number {
  return columns.length === 1 ? columns[0]! : columns[rng.int(0, columns.length - 1)]!;
}
