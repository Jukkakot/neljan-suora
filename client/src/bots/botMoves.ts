import { chooseMove, type Budget } from "@neljan-suora/bots";
import type { Game, Move } from "@neljan-suora/rules";

/**
 * What the game asks a bot: the move of the seat on turn in `game` within `budget`, seeded so the
 * same question gets the same answer. Plain data, so it crosses the Web Worker boundary as is.
 */
export interface MoveRequest {
  readonly game: Game;
  readonly budget: Budget;
  readonly seed: number;
}

/** Asks for a bot move; resolves undefined when there is none. */
export type AskBot = (request: MoveRequest) => Promise<Move | undefined>;

/** The budget of one bot move: it thinks during the pause people see before it moves, with a margin. */
export const BOT_BUDGET = { timeMs: 800 } as const satisfies Budget;

/** The budget at a watching speed: the pause shrinks with the speed, and so does the thinking. */
export function botBudget(speed = 1): Budget {
  return { timeMs: BOT_BUDGET.timeMs / speed };
}

/** The bot's answer, computed right here (the worker runs this; so do tests and old browsers). */
export function answer({ game, budget, seed }: MoveRequest): Move | undefined {
  return chooseMove(game, budget, seed);
}
