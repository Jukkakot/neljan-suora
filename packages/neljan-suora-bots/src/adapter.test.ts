import { describe, expect, it } from "vitest";
import { freeCells, startGame } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { brsPlayer, chooseMove, greedyPlayer, mctsPlayer, randomPlayer, neljanSuoraGame as game } from "./adapter.js";
import { evaluate, WIN } from "./evaluation.js";
import { playGame } from "./match.js";
import { parseBot, playTournamentGame } from "./tournament.js";

describe("adapter", () => {
  it("offers the free cells of the seat on turn, and none once over", () => {
    const state = gameAfter([4]);
    expect([game.toMove(state), game.moves(state)]).toEqual([2, [0, 1, 2, 3, 5, 6, 7, 8]]);
    expect(game.players(state)).toEqual([1, 2]);
    expect(game.moves(gameAfter([0, 3, 1, 4, 2]))).toEqual([]);
  });

  it("plays out of turn for search", () => {
    const after = game.playAs(gameAfter([4]), 1, 0);
    expect(after.cells.slice(0, 1)).toEqual([1]);
    expect(game.toMove(after)).toBe(2);
  });

  it("rates a won game above any open one", () => {
    expect(evaluate(gameAfter([0, 3, 1, 4, 2]), 1)).toBe(WIN);
    expect(evaluate(gameAfter([0, 3, 1, 4, 2]), 2)).toBe(-WIN);
    expect(evaluate(gameAfter([4]), 1)).toBeGreaterThan(evaluate(gameAfter([4]), 2));
  });
});

describe("bots", () => {
  it.each([
    ["greedy", greedyPlayer],
    ["brs", brsPlayer],
    ["mcts", mctsPlayer],
  ] as const)("%s takes a winning cell", (_, bot) => {
    // Seat 1 has 0 and 1; seat 2 has 3 and 4; seat 1 to move wins with 2.
    expect(chooseMove(gameAfter([0, 3, 1, 4]), { depth: 2, iterations: 200 }, 1, bot)).toEqual({ cell: 2 });
  });

  it("search blocks the other's line; greedy may not", () => {
    // Seat 2 to move: seat 1 threatens 0-1-2.
    expect(chooseMove(gameAfter([0, 4, 1]), { depth: 2 }, 1, brsPlayer)).toEqual({ cell: 2 });
  });

  it("a whole game of random bots ends, the same for the same seed", () => {
    const run = () => playGame(startGame(5, [1, 2]), { 1: randomPlayer, 2: randomPlayer }, 9).at(-1)!;
    expect(run().over).toBe(true);
    expect(run()).toEqual(run());
    expect(chooseMove(run(), { depth: 1 }, 1)).toBeUndefined();
  });

  it("only free cells are chosen", () => {
    const state = gameAfter([0, 4, 8]);
    for (let seed = 0; seed < 10; seed++) expect(freeCells(state.cells)).toContain(chooseMove(state, { depth: 1 }, seed, randomPlayer)!.cell);
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
  });
});
