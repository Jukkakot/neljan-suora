import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COLUMNS, createRng, legalColumns, playMove, ROWS, startGame } from "@neljan-suora/rules";
import { Position } from "../src/negamax/position.js";
import { canonicalKey } from "../src/perfect/book.js";
import { Solver, type Oracle, type Outcome } from "../src/perfect/solve.js";

/*
 * John Tromp's Connect-4 opening database (UCI Machine Learning Repository, CC BY 4.0): every legal
 * position of 8 discs where nobody has won and the next disc is not forced, with its outcome for the
 * first player (who is also the side to move with 8 discs down). Only the book generator uses it, to
 * stop its searches at 8 discs; it is downloaded into `book/.cache/` (development → Opening book) and
 * never committed or shipped.
 */
export const ORACLE_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "book", ".cache", "connect-4.data");
const DISCS = 8;
const STRIDE = ROWS + 1;
const OUTCOMES: Readonly<Record<string, Outcome>> = { win: 1, draw: 0, loss: -1 };

/** The position's book key from one database line's 42 cells (column by column, bottom up). */
function keyOf(cells: readonly string[]): number {
  let key = 0;
  for (let column = 0; column < COLUMNS; column++) {
    let chunk = 0;
    for (let row = 0; row < ROWS; row++) {
      const cell = cells[column * ROWS + row];
      if (cell === "b") break;
      // cur + mask: the side to move's discs (x) once more on top of every disc.
      chunk += (1 << row) + (cell === "x" ? 1 << row : 0);
    }
    key += chunk * 2 ** (STRIDE * column);
  }
  return key;
}

/** The mirror image's key. */
function mirrorOf(key: number): number {
  let mirror = 0;
  for (let column = 0; column < COLUMNS; column++) {
    const chunk = Math.floor(key / 2 ** (STRIDE * column)) % 2 ** STRIDE;
    mirror += chunk * 2 ** (STRIDE * (COLUMNS - 1 - column));
  }
  return mirror;
}

/** The database as an oracle, or undefined when it has not been downloaded. */
export function loadOracle(file = ORACLE_FILE): (Oracle & { readonly size: number; readonly entries: ReadonlyMap<number, Outcome> }) | undefined {
  if (!existsSync(file)) return undefined;
  const entries = new Map<number, Outcome>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const fields = line.trim().split(",");
    if (fields.length !== COLUMNS * ROWS + 1) continue;
    const outcome = OUTCOMES[fields[COLUMNS * ROWS]!];
    if (outcome === undefined) throw new Error(`Unknown outcome in ${file}: ${line}`);
    const key = keyOf(fields);
    entries.set(Math.min(key, mirrorOf(key)), outcome);
  }
  return {
    discs: DISCS,
    size: entries.size,
    entries,
    outcome: (position) => entries.get(canonicalKey(position).key),
  };
}

/**
 * Checks the oracle against the solver on `samples` random 8-disc positions found in it; throws on
 * the first disagreement (a wrong file or a wrong reading of it).
 */
export function checkOracle(oracle: Oracle, samples: number, seed = 1): void {
  const rng = createRng(seed);
  const solver = new Solver(22);
  for (let checked = 0, tries = 0; checked < samples; tries++) {
    if (tries > samples * 50) throw new Error("Oracle check: too few random positions found in the database");
    let game = startGame(seed + tries, [1, 2]);
    while (game.moves < DISCS && !game.over) {
      const legal = legalColumns(game.cells);
      const result = playMove(game, game.turn, { column: legal[rng.int(0, legal.length - 1)]! });
      if (!result.ok) throw new Error(result.code);
      game = result.game;
    }
    if (game.over) continue;
    const position = Position.fromGame(game);
    const known = oracle.outcome(position);
    if (known === undefined) continue;
    const solved = solver.solve(position);
    if (solved !== known) throw new Error(`Oracle check: database says ${known}, the solver ${solved} (seed ${seed + tries})`);
    checked++;
  }
}
