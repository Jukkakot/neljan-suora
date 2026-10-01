import { describe, expect, it } from "vitest";
import { negamaxPlayer, parseBot, playTournamentGame, randomPlayer, type TournamentBot } from "../src/index.js";
import { checkWithSettled, type Requirement } from "./settled.js";

const requirement: Requirement = { name: "r", candidate: "perfect", baseline: "negamax@d8", colours: 2, games: 2, seed: 1, minShare: 0.8, noLossWhenSettled: true };

describe("settled-loss check", () => {
  it("records a bot that judged a win at its first move and lost", () => {
    const bluffer: TournamentBot = { label: "bluffer", name: "bluffer", bot: randomPlayer, budget: { depth: 1 }, verdict: () => 1 };
    const strong: TournamentBot = { label: "strong", name: "strong", bot: negamaxPlayer, budget: { depth: 6 } };
    const bots = new Map([
      ["bluffer", bluffer],
      ["strong", strong],
    ]);
    const played = playTournamentGame(2, bots, { index: 0, pairing: ["bluffer", "strong"], swapped: false, seed: 3 });
    expect(played.result.scores).toEqual([0, 1]);
    expect(played.lostSettled).toEqual(["bluffer"]);
  });

  it("fails a requirement with a lost settled game and passes one without", () => {
    const pass = { line: "PASS r: 0.9 ≥ 0.8", passed: true };
    expect(checkWithSettled(requirement, pass, new Map())).toEqual({ line: "PASS r: 0.9 ≥ 0.8; no settled game lost", passed: true });
    expect(checkWithSettled(requirement, pass, new Map([["perfect", 2]]))).toEqual({ line: "FAIL r: 0.9 ≥ 0.8; 2 settled game(s) lost", passed: false });
    expect(checkWithSettled({ ...requirement, noLossWhenSettled: false }, pass, new Map([["perfect", 2]]))).toBe(pass);
  });

  it("knows the perfect bot with a machine-independent budget", () => {
    expect(parseBot("perfect").budget).toEqual({ depth: 8, iterations: 1_500_000 });
  });
});
