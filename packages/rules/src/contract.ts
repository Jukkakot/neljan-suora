import type { GameRules, LogFields } from "@game-kit/protocol";
import { endGame, playMove, randomMove, removeSeat, startGame, type Game, type Move } from "./game.js";

/*
 * Neljän suora's side of the game kit's contract: a thin wrapper over the rules (`game.ts`), which
 * the server's room and the games on the device run. No rules live here.
 */

/**
 * Neljän suora's options. `firstSeat` is only set by games on the device (the person's choice of who
 * starts, the alternating rematch); online games never carry it (the protocol's `optionsSchema`
 * accepts no options). A variant (a larger grid …) would go here and in the protocol's schema.
 */
export interface NeljanSuoraOptions {
  readonly firstSeat?: number;
}

export const DEFAULT_OPTIONS: NeljanSuoraOptions = {};

export const moveText = (move: Move): string => `col${move.column}`;

export const neljanSuoraRules: GameRules<Game, Move, NeljanSuoraOptions> = {
  seatRange: () => ({ min: 2, max: 2 }),

  start: (seed, seats, options) => startGame(seed, seats.map((s) => s.seat), options.firstSeat),

  seatOnTurn: (game) => (game.over ? 0 : game.turn),

  turnFacts: (game): LogFields => ({ moves: game.moves }),

  play(game, seat, move) {
    const result = playMove(game, seat, move);
    if (result.ok) return result;
    const withMove = result.code === "COLUMN_FULL" || result.code === "INVALID_COMMAND";
    return { ok: false, code: result.code, ...(withMove && { facts: { seat, move: moveText(move) } }) };
  },

  removeSeat,

  isOver: (game) => game.over,

  winners: (game) => game.winners,

  end: endGame,

  fallbackMove: randomMove,

  finishFacts: (game): LogFields => ({ moves: game.moves, winners: game.winners.join(",") }),

  moveText,
};
