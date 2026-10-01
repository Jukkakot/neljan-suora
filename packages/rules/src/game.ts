import { createRng } from "./rng.js";

/*
 * The placeholder game: Ristinolla (tic-tac-toe). Two seats take turns marking an empty cell of a
 * 3×3 board; three in a row (across, down or diagonal) wins, a full board is a draw. Replace this
 * file with the real game's rules (roadmap: `rules-engine`); keep the rules pure and seeded.
 */

export const SIZE = 3;
export const CELLS = SIZE * SIZE;

/** A move: the cell (0–8, row-major) to mark. */
export interface Move {
  cell: number;
}

/** Why a move is refused, on top of the kit's codes (see `@neljan-suora/protocol` → game codes). */
export type MoveRefusal = "CELL_TAKEN" | "INVALID_COMMAND";

export interface Game {
  readonly seed: number;
  /** Seats still in the game, ascending. */
  readonly seats: readonly number[];
  /** Seats whose player left. */
  readonly left: readonly number[];
  /** Row-major; 0 = empty, else the seat whose mark it is. */
  readonly cells: readonly number[];
  /** The seat on turn; 0 once the game is over. */
  readonly turn: number;
  /** Moves made so far. */
  readonly moves: number;
  readonly over: boolean;
  readonly winners: readonly number[];
  /** The winning line's cells once someone has three in a row; empty otherwise. */
  readonly line: readonly number[];
}

/** Every line of three: rows, columns and both diagonals. */
export const LINES: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** The line `seat` completed on `cells`, or undefined. */
export function winningLine(cells: readonly number[], seat: number): readonly number[] | undefined {
  return LINES.find((line) => line.every((i) => cells[i] === seat));
}

/** The empty cells, ascending. */
export function freeCells(cells: readonly number[]): number[] {
  return cells.flatMap((owner, i) => (owner === 0 ? [i] : []));
}

/** The seat after `seat` among those still in the game. */
function nextSeat(seats: readonly number[], seat: number): number {
  return seats.find((s) => s > seat) ?? seats[0] ?? 0;
}

/** A new game for `seats`; the seed draws who starts. */
export function startGame(seed: number, seats: readonly number[]): Game {
  const ordered = [...seats].sort((a, b) => a - b);
  const turn = ordered[createRng(seed).int(0, ordered.length - 1)]!;
  return { seed, seats: ordered, left: [], cells: Array.from({ length: CELLS }, () => 0), turn, moves: 0, over: false, winners: [], line: [] };
}

export type PlayOutcome = { ok: true; game: Game } | { ok: false; code: "NOT_SEATED" | "WRONG_PHASE" | "NOT_YOUR_TURN" | MoveRefusal };

/** `seat` marks `move.cell`. Refusals change nothing. */
export function playMove(game: Game, seat: number, move: Move): PlayOutcome {
  if (!game.seats.includes(seat)) return { ok: false, code: "NOT_SEATED" };
  if (game.over) return { ok: false, code: "WRONG_PHASE" };
  if (game.turn !== seat) return { ok: false, code: "NOT_YOUR_TURN" };
  const { cell } = move;
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return { ok: false, code: "INVALID_COMMAND" };
  if (game.cells[cell] !== 0) return { ok: false, code: "CELL_TAKEN" };
  const cells = [...game.cells];
  cells[cell] = seat;
  const moves = game.moves + 1;
  const line = winningLine(cells, seat);
  if (line) return { ok: true, game: { ...game, cells, moves, turn: 0, over: true, winners: [seat], line } };
  if (moves === CELLS) return { ok: true, game: { ...game, cells, moves, turn: 0, over: true, winners: [] } };
  return { ok: true, game: { ...game, cells, moves, turn: nextSeat(game.seats, seat) } };
}

/** `seat`'s player leaves: the other seat wins (two seats), else the turn moves on. */
export function removeSeat(game: Game, seat: number): Game {
  if (game.over || !game.seats.includes(seat)) return game;
  const seats = game.seats.filter((s) => s !== seat);
  const left = [...game.left, seat];
  if (seats.length <= 1) return { ...game, seats, left, turn: 0, over: true, winners: seats };
  return { ...game, seats, left, turn: game.turn === seat ? nextSeat(seats, seat) : game.turn };
}

/** Nobody is left: the game ends at once with no winner. */
export function endGame(game: Game): Game {
  return game.over ? game : { ...game, turn: 0, over: true, winners: [] };
}

/** The server's fallback move: a free cell drawn from the seed and the move count. */
export function randomMove(game: Game): Move | undefined {
  if (game.over) return undefined;
  const free = freeCells(game.cells);
  if (free.length === 0) return undefined;
  return { cell: free[createRng((game.seed + game.moves) % 2 ** 32).int(0, free.length - 1)]! };
}
