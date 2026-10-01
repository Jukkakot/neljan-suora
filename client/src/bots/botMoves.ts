import { Book, chooseMove, devicePlayer, SOLVE_NODES, type Budget } from "@neljan-suora/bots";
import type { Game, Move } from "@neljan-suora/rules";

/**
 * What the game asks a bot: the move of the seat on turn in `game` within `budget`, seeded so the
 * same question gets the same answer. Plain data, so it crosses the Web Worker boundary as is. The
 * first question after the opening book arrives carries it (`book`); the worker keeps it from then on.
 */
export interface MoveRequest {
  readonly game: Game;
  readonly budget: Budget;
  readonly seed: number;
  readonly book?: ArrayBuffer;
}

/** Asks for a bot move; resolves undefined when there is none. */
export type AskBot = (request: MoveRequest) => Promise<Move | undefined>;

/**
 * The budget of one bot move: up to 3 s, the solve limited to what a mid-range phone settles in
 * about 2 s. A move settled quickly still waits for the visible pause; only an unsettled position
 * makes the bot think longer.
 */
export const BOT_BUDGET = { timeMs: 3000, iterations: SOLVE_NODES } as const satisfies Budget;

/** The budget at a watching speed: the pause shrinks with the speed, and so does the thinking. */
export function botBudget(speed = 1): Budget {
  return { timeMs: BOT_BUDGET.timeMs / speed, iterations: Math.round(BOT_BUDGET.iterations / speed) };
}

/** The bot's answer, computed right here (the worker runs this; so do tests and old browsers). */
export function answer({ game, budget, seed, book }: MoveRequest): Move | undefined {
  if (book) devicePlayer.setBook(Book.parse(book));
  return chooseMove(game, budget, seed);
}
