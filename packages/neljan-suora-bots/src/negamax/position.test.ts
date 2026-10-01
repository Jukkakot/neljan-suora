import { describe, expect, it } from "vitest";
import { bitsOf, cellAt, COLUMNS, createRng, hasFour, legalColumns, playMove, ROWS, startGame, type Game } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { out, Position, winningCells } from "./position.js";

/** Every position of `count` seeded random games, the start included. */
function randomGames(count: number): Game[] {
  const states: Game[] = [];
  for (let seed = 0; seed < count; seed++) {
    const rng = createRng(seed);
    let game = startGame(seed, [1, 2]);
    states.push(game);
    while (!game.over) {
      const legal = legalColumns(game.cells);
      const result = playMove(game, game.turn, { column: legal[rng.int(0, legal.length - 1)]! });
      if (!result.ok) throw new Error(result.code);
      game = result.game;
      states.push(game);
    }
  }
  return states;
}

const bitSet = (column: number, height: number): boolean => {
  const bit = (column % 4) * (ROWS + 1) + height;
  return ((column < 4 ? out.lo : out.hi) & (1 << bit)) !== 0;
};

const fields = (p: Position) => ({ ...p, heights: [...p.heights], material: [...p.material] });

describe("position", () => {
  const states = randomGames(200).filter((game) => !game.over);

  it("finds exactly the empty cells that complete four, for both sides", () => {
    for (const game of states) {
      const position = Position.fromGame(game);
      const other = game.seats.find((seat) => seat !== game.turn)!;
      for (const [seat, lo, hi] of [
        [game.turn, position.curLo, position.curHi],
        [other, position.curLo ^ position.maskLo, position.curHi ^ position.maskHi],
      ] as const) {
        winningCells(lo, hi, position.maskLo, position.maskHi);
        for (let column = 0; column < COLUMNS; column++) {
          for (let height = 0; height < ROWS; height++) {
            const cell = cellAt(column, height);
            const cells = [...game.cells];
            cells[cell] = seat;
            const expected = game.cells[cell] === 0 && hasFour(bitsOf(cells, seat));
            expect(bitSet(column, height), `seed ${game.seed} col ${column} h ${height}`).toBe(expected);
          }
        }
      }
    }
  });

  it("plays like the rules and takes moves back exactly", () => {
    for (const game of states) {
      const position = Position.fromGame(game);
      for (const column of legalColumns(game.cells)) {
        const before = fields(position);
        const result = playMove(game, game.turn, { column });
        if (!result.ok) throw new Error(result.code);
        expect(position.isWinningMove(column)).toBe(result.game.over && result.game.winners.length > 0);
        position.play(column);
        if (!result.game.over) expect(fields(position)).toEqual(fields(Position.fromGame(result.game)));
        position.undo(column);
        expect(fields(position)).toEqual(before);
      }
    }
  });

  it("keys tell positions apart", () => {
    const keys = new Map<number, string>();
    for (const game of states) {
      const key = Position.fromGame(game).key();
      const id = `${game.moves % 2}:${game.cells.map((c) => (c === 0 ? 0 : c === game.turn ? 1 : 2)).join("")}`;
      expect(keys.get(key) ?? id).toBe(id);
      keys.set(key, id);
    }
    expect(Position.fromGame(gameAfter([3])).key()).not.toBe(Position.fromGame(gameAfter([2])).key());
  });
});
