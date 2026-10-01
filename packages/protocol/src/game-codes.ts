import { KIT_ERROR_CODES, type JoinOptions as KitJoinOptions } from "@game-kit/protocol";

// The kit's generic codes, payloads, join options, close codes and turn rules; Neljän suora's own follow.
export * from "@game-kit/protocol";

/**
 * Cells on the board. It mirrors `CELLS` in `@neljan-suora/rules` (protocol must not depend on rules);
 * a server test keeps them equal.
 */
export const BOARD_CELLS = 9;

/** Neljän suora's move refusals, on top of the kit's codes. */
export const MOVE_ERROR_CODES = ["CELL_TAKEN"] as const;

/** Error codes of game commands, on top of `COMMON_ERROR_CODES`: the kit's and the game's own. */
export const GAME_ERROR_CODES = [...KIT_ERROR_CODES, ...MOVE_ERROR_CODES] as const;
export type GameErrorCode = (typeof GAME_ERROR_CODES)[number];

/** Neljän suora's options (the host's `setOptions` in the waiting room): none yet. */
export type NeljanSuoraOptions = Record<string, never>;

/** Neljän suora's move (the `move` and `botMove` commands): the cell to mark, row-major. */
export interface MovePayload {
  cell: number;
}

/** Options a client sends when it joins or creates a game room, with the game's options. */
export type JoinOptions = KitJoinOptions<NeljanSuoraOptions>;
