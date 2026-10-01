import { describe, expect, it } from "vitest";
import { legalColumns, startGame } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { brsPlayer, chooseMove, greedyPlayer, mctsPlayer, negamaxPlayer, randomPlayer, neljanSuoraGame as game } from "./adapter.js";
import { evaluate, WIN } from "./evaluation.js";
import { playGame } from "./match.js";
import { OPENING_PLIES, openedGame, parseBot, playTournamentGame } from "./tournament.js";

describe("adapter", () => {
  it("offers the open columns of the seat on turn, and none once over", () => {
    const state = gameAfter([3]);
    expect([game.toMove(state), game.moves(state)]).toEqual([2, [0, 1, 2, 3, 4, 5, 6]]);
    expect(game.players(state)).toEqual([1, 2]);
    expect(game.moves(gameAfter([0, 0, 0, 0, 0, 0]))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(game.moves(gameAfter([0, 1, 0, 1, 0, 1, 0]))).toEqual([]);
  });

  it("plays out of turn for search", () => {
    const after = game.playAs(gameAfter([3]), 1, 0);
    expect(after.cells[35]).toBe(1);
    expect(game.toMove(after)).toBe(2);
  });

  it("rates a won game above any open one", () => {
    expect(evaluate(gameAfter([0, 1, 0, 1, 0, 1, 0]), 1)).toBe(WIN);
    expect(evaluate(gameAfter([0, 1, 0, 1, 0, 1, 0]), 2)).toBe(-WIN);
    expect(evaluate(gameAfter([3]), 1)).toBeGreaterThan(evaluate(gameAfter([3]), 2));
  });
});

describe("bots", () => {
  it.each([
    ["greedy", greedyPlayer],
    ["brs", brsPlayer],
    ["mcts", mctsPlayer],
    ["negamax", negamaxPlayer],
  ] as const)("%s takes a winning column", (_, bot) => {
    // Seat 1 has three in column 0, seat 2 three in column 1; seat 1 to move wins in column 0.
    expect(chooseMove(gameAfter([0, 1, 0, 1, 0, 1]), { depth: 2, iterations: 200 }, 1, bot)).toEqual({ column: 0 });
  });

  it("search blocks the other's line; greedy may not", () => {
    // Seat 2 to move: seat 1 threatens four up in column 0.
    expect(chooseMove(gameAfter([0, 1, 0, 1, 0]), { depth: 2 }, 1, brsPlayer)).toEqual({ column: 0 });
  });

  it("a whole game of random bots ends, the same for the same seed", () => {
    const run = () => playGame(startGame(5, [1, 2]), { 1: randomPlayer, 2: randomPlayer }, 9).at(-1)!;
    expect(run().over).toBe(true);
    expect(run()).toEqual(run());
    expect(chooseMove(run(), { depth: 1 }, 1)).toBeUndefined();
  });

  it("only open columns are chosen", () => {
    const state = gameAfter([0, 0, 0, 0, 0, 0]);
    for (let seed = 0; seed < 10; seed++) expect(legalColumns(state.cells)).toContain(chooseMove(state, { depth: 1 }, seed, randomPlayer)!.column);
  });
});

describe("tournament", () => {
  it("plays a scheduled game and scores the winner 1", () => {
    const bots = new Map(["random", "brs"].map((label) => [label, parseBot(label)]));
    const { result } = playTournamentGame(2, bots, { index: 0, pairing: ["random", "brs"], swapped: false, seed: 3 });
    expect(result.seats).toEqual(["random", "brs"]);
    expect(result.scores[0]).toBe(0);
  });

  it("refuses unknown bots and bad budgets", () => {
    expect(() => parseBot("nobody")).toThrow(/Unknown bot/);
    expect(() => parseBot("greedy@d0")).toThrow(/at least 1/);
    expect(parseBot("brs@d3").budget).toEqual({ depth: 3 });
    expect(parseBot("negamax").budget).toEqual({ depth: 8 });
    expect(parseBot("negamax@100ms").budget).toEqual({ timeMs: 100 });
  });

  it("starts every game from a random opening of the seed, the same for both seat orders", () => {
    const opened = openedGame(3, [1, 2]);
    expect(opened.moves).toBe(OPENING_PLIES);
    expect(openedGame(3, [1, 2])).toEqual(opened);
    const bots = new Map(["random", "negamax@d2"].map((label) => [label, parseBot(label)]));
    for (const swapped of [false, true]) {
      const { result } = playTournamentGame(2, bots, { index: 0, pairing: ["random", "negamax@d2"], swapped, seed: 3 });
      expect(result.scores).toEqual(result.seats.map((label) => (label === "negamax@d2" ? 1 : 0)));
    }
  });
});
