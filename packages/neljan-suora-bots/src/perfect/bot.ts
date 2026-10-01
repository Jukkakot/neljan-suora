import { checkBudget, systemClock, type Bot, type Budget, type Clock } from "@game-kit/bots";
import type { Game, Rng } from "@neljan-suora/rules";
import { Position } from "../negamax/position.js";
import { negamaxBot, type NegamaxBot } from "../negamax/search.js";
import type { Book } from "./book.js";
import { Solver, type RootVerdict } from "./solve.js";

/**
 * The solve's node limit in the browser: what the solver settles in about 2 s on a mid-range phone a
 * few years old (measured ~2.9 M nodes/s on a desktop, the phone taken as a quarter of that). The
 * opening book holds the positions that need more.
 */
export const SOLVE_NODES = 1_500_000;
/** Share of a time budget the solve may use; the heuristic search gets the rest. */
const SOLVE_SHARE = 0.7;

/** Where an answer's verdict came from. */
export type VerdictSource = "book" | "solve" | "unsettled";

export interface PerfectOptions {
  /** Clock for the time budget; defaults to the platform clock. */
  readonly now?: Clock;
  readonly book?: Book;
  /** log2 of the solver's table entries (default 21). */
  readonly solverTableBits?: number;
  /** log2 of the heuristic search's table entries (default 20). */
  readonly searchTableBits?: number;
  /** Told each answer's verdict (strength checks, benchmarks). */
  readonly report?: (info: { readonly source: VerdictSource; readonly verdict?: RootVerdict }) => void;
}

export interface PerfectBot extends Bot<Game, number> {
  /** Uses `book` from the next answer on (undefined: none). */
  setBook(book: Book | undefined): void;
}

/**
 * The perfect bot: keeps the position's best outcome under perfect play when the book or a solve
 * within the budget settles it, and lets the heuristic search choose among the columns of that
 * outcome (shortest wins, longest losses, the seed among equals). Unsettled, or lost anyway, the
 * heuristic search chooses among every column. Budget: `iterations` limits the solve's nodes, `depth`
 * the heuristic search, `timeMs` the whole answer (the solve takes at most 70 % of it).
 */
export function perfectBot(options: PerfectOptions = {}): PerfectBot {
  const now = options.now ?? systemClock;
  let book = options.book;
  let solver: Solver | undefined;
  const search: NegamaxBot = negamaxBot({ now, tableBits: options.searchTableBits });

  return {
    setBook(next) {
      book = next;
    },

    choose(game: Game, budget: Budget, rng: Rng): number | undefined {
      checkBudget(budget);
      if (game.over) return undefined;
      const started = now();
      const position = Position.fromGame(game);

      let source: VerdictSource = "book";
      let verdict: RootVerdict | undefined = book?.lookup(position);
      if (!verdict) {
        source = "solve";
        solver ??= new Solver(options.solverTableBits);
        const solveEnd = budget.timeMs === undefined ? Infinity : started + budget.timeMs * SOLVE_SHARE;
        verdict = solver.solveRoot(position, { nodes: budget.iterations, expired: () => now() >= solveEnd });
        if (!verdict) source = "unsettled";
      }
      options.report?.({ source, verdict });

      const candidates = verdict && verdict.outcome >= 0 ? verdict.columns : undefined;
      if (candidates?.length === 1) return candidates[0];
      const rest: Budget = {
        ...(budget.depth === undefined ? {} : { depth: budget.depth }),
        ...(budget.timeMs === undefined ? {} : { timeMs: Math.max(1, budget.timeMs - (now() - started)) }),
      };
      return search.chooseAmong(game, rest, rng, candidates);
    },
  };
}
