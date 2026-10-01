import { bitsOf, cellAt, CELLS, COLUMNS, hasFour, LINES, ROWS } from "./bitboard.js";
import { createRng } from "./rng.js";

/*
 * Neljän suora: two seats take turns dropping a disc into a column of an upright 7 × 6 grid; it lands
 * in the lowest empty cell. Four of a seat's discs in a row (across, up or diagonal) win at once, a
 * full grid is a draw. The game is plain JSON data; the win check runs on bitboards.
 */

/** A move: the column (0–6, left to right) to drop a disc into. */
export interface Move {
  column: number;
}

/** Why a move is refused, on top of the kit's codes (see `@neljan-suora/protocol` → game codes). */
export type MoveRefusal = "COLUMN_FULL" | "INVALID_COMMAND";

export interface Game {
  readonly seed: number;
  /** Seats still in the game, ascending. */
  readonly seats: readonly number[];
  /** Seats whose player left. */
  readonly left: readonly number[];
  /** Row-major, top row first; 0 = empty, else the seat whose disc it is. */
  readonly cells: readonly number[];
  /** The seat on turn; 0 once the game is over. */
  readonly turn: number;
  /** Moves made so far. */
  readonly moves: number;
  readonly over: boolean;
  readonly winners: readonly number[];
  /** Every cell of the lines of four the winning disc completed, ascending; empty otherwise. */
  readonly line: readonly number[];
}

/** The cell a disc dropped into `column` lands in, or undefined when the column is full. */
export function landingCell(cells: readonly number[], column: number): number | undefined {
  for (let height = 0; height < ROWS; height++) {
    const cell = cellAt(column, height);
    if (cells[cell] === 0) return cell;
  }
  return undefined;
}

/** The columns that are not full, left to right. */
export function legalColumns(cells: readonly number[]): number[] {
  return Array.from({ length: COLUMNS }, (_, column) => column).filter((column) => cells[column] === 0);
}

/** The cells of every line of four through `cell` that `seat` holds whole, ascending. */
export function winningLine(cells: readonly number[], seat: number, cell: number): number[] {
  const won = LINES.filter((line) => line.includes(cell) && line.every((i) => cells[i] === seat));
  return [...new Set(won.flat())].sort((a, b) => a - b);
}

/** The seat after `seat` among those still in the game. */
function nextSeat(seats: readonly number[], seat: number): number {
  return seats.find((s) => s > seat) ?? seats[0] ?? 0;
}

/** Who has the first turn: `firstSeat` when it is one of `seats`, otherwise drawn from the seed. */
export function firstTurn(seed: number, seats: readonly number[], firstSeat?: number): number {
  const ordered = [...seats].sort((a, b) => a - b);
  if (firstSeat !== undefined && ordered.includes(firstSeat)) return firstSeat;
  return ordered[createRng(seed).int(0, ordered.length - 1)]!;
}

/** A new game for `seats`; `firstSeat` starts when given, otherwise the seed draws who starts. */
export function startGame(seed: number, seats: readonly number[], firstSeat?: number): Game {
  const ordered = [...seats].sort((a, b) => a - b);
  const turn = firstTurn(seed, ordered, firstSeat);
  return { seed, seats: ordered, left: [], cells: Array.from({ length: CELLS }, () => 0), turn, moves: 0, over: false, winners: [], line: [] };
}

export type PlayOutcome = { ok: true; game: Game } | { ok: false; code: "NOT_SEATED" | "WRONG_PHASE" | "NOT_YOUR_TURN" | MoveRefusal };

/** `seat` drops a disc into `move.column`. Refusals change nothing. */
export function playMove(game: Game, seat: number, move: Move): PlayOutcome {
  if (!game.seats.includes(seat)) return { ok: false, code: "NOT_SEATED" };
  if (game.over) return { ok: false, code: "WRONG_PHASE" };
  if (game.turn !== seat) return { ok: false, code: "NOT_YOUR_TURN" };
  const { column } = move;
  if (!Number.isInteger(column) || column < 0 || column >= COLUMNS) return { ok: false, code: "INVALID_COMMAND" };
  const cell = landingCell(game.cells, column);
  if (cell === undefined) return { ok: false, code: "COLUMN_FULL" };
  const cells = [...game.cells];
  cells[cell] = seat;
  const moves = game.moves + 1;
  if (hasFour(bitsOf(cells, seat))) {
    return { ok: true, game: { ...game, cells, moves, turn: 0, over: true, winners: [seat], line: winningLine(cells, seat, cell) } };
  }
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

/** The server's fallback move: a column that is not full, drawn from the seed and the move count. */
export function randomMove(game: Game): Move | undefined {
  if (game.over) return undefined;
  const legal = legalColumns(game.cells);
  if (legal.length === 0) return undefined;
  return { column: legal[createRng((game.seed + game.moves) % 2 ** 32).int(0, legal.length - 1)]! };
}
