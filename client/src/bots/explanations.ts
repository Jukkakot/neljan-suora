import { useSyncExternalStore } from "react";
import type { MoveHow } from "@neljan-suora/bots";
import { playMove, type Game, type Move } from "@neljan-suora/rules";
import type { AskBot, AskExplained } from "./botMoves.ts";

/** How a bot move worked out on this device was chosen, and by which seat. */
export interface Explanation {
  readonly seat: number;
  readonly how: MoveHow;
}

/** The board the move led to: an explanation belongs to that state only (online views carry no seed). */
const keyOf = (board: readonly number[]) => board.join("");
/** Only the latest few are kept: a game shows one at a time. */
const KEEP = 8;

const explanations = new Map<string, Explanation>();
const listeners = new Set<() => void>();

/** Remembers how the bot in `game`'s seat on turn chose `move`. */
export function recordExplanation(game: Game, move: Move, how: MoveHow): void {
  const result = playMove(game, game.turn, move);
  if (!result.ok) return;
  explanations.set(keyOf(result.game.cells), { seat: game.turn, how });
  while (explanations.size > KEEP) explanations.delete(explanations.keys().next().value!);
  for (const listener of listeners) listener();
}

/** The explanation of the move that led to `board`, if a bot here worked it out. */
export function explanationOf(board: readonly number[]): Explanation | undefined {
  return explanations.get(keyOf(board));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** `explanationOf`, re-rendering when a new explanation arrives. */
export function useExplanation(board: readonly number[]): Explanation | undefined {
  return useSyncExternalStore(subscribe, () => explanationOf(board));
}

/** The plain move asker the session needs, remembering each answer's explanation on the way. */
export function recording(ask: AskExplained): AskBot {
  return async (question) => {
    const { move, how } = await ask(question);
    if (move && how) recordExplanation(question.game, move, how);
    return move;
  };
}
