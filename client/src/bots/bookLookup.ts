import { cellsOf, type ExplainedMove, type RootVerdict } from "@neljan-suora/bots";
import type { AskExplained, MoveRequest } from "./botMoves.ts";

/** The book holds positions up to 14 discs; a verdict needs the positions after the next move too. */
export const BOOK_MAX_DISCS = 13;
/** How long a move waits for the server's answer before the bot chooses without the book. */
export const LOOKUP_TIMEOUT_MS = 800;

export interface LookupDeps {
  /** GETs `path` (`/book?cells=…`) from the game server; rejects on failure or after `timeoutMs`. */
  readonly get: (path: string, timeoutMs: number) => Promise<unknown>;
  /** Told once per visit when a lookup fails. */
  readonly onFailure: (message: string) => void;
}

const isOutcome = (value: unknown): value is -1 | 0 | 1 => value === -1 || value === 0 || value === 1;
const isColumns = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every((column) => Number.isInteger(column) && column >= 0 && column <= 6);

/** The verdict in the route's answer; undefined for `{known:false}`; throws on anything else. */
export function verdictOf(body: unknown): RootVerdict | undefined {
  const { known, outcome, columns } = (body ?? {}) as Record<string, unknown>;
  if (known === false) return undefined;
  if (known === true && isOutcome(outcome) && isColumns(columns)) return { outcome, columns };
  throw new Error("bad book answer");
}

/**
 * Wraps the bot so each question in an opening position first asks the game server's opening book
 * (briefly); the bot then chooses among the verdict's columns, or as if it had no book when the
 * server is offline, asleep, slow or does not hold the position. A failure is reported once per
 * visit; nothing is logged per move.
 */
export function withBookLookup(ask: (request: MoveRequest) => Promise<ExplainedMove>, deps: LookupDeps): AskExplained {
  let reported = false;

  const lookup = async (cells: string): Promise<RootVerdict | undefined> => {
    try {
      return verdictOf(await deps.get(`/book?cells=${cells}`, LOOKUP_TIMEOUT_MS));
    } catch (error) {
      if (!reported) {
        reported = true;
        deps.onFailure(error instanceof Error ? error.message : String(error));
      }
      return undefined;
    }
  };

  return async (question) => {
    const cells = question.game.moves <= BOOK_MAX_DISCS ? cellsOf(question.game) : undefined;
    const verdict = cells === undefined ? undefined : await lookup(cells);
    return ask(verdict ? { ...question, verdict } : question);
  };
}
