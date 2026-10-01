import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isColours, parseBot } from "../src/index.js";

interface Requirement {
  readonly name: string;
  readonly candidate: string;
  readonly baseline: string;
  readonly colours: number;
  readonly games: number;
  readonly minShare: number;
}

describe("strength requirements", () => {
  it("every requirement names known bots at a machine-independent budget and a known format", () => {
    const list = JSON.parse(readFileSync(new URL("../strength.json", import.meta.url), "utf8")) as Requirement[];
    expect(list.length).toBeGreaterThan(0);
    for (const requirement of list) {
      for (const label of [requirement.candidate, requirement.baseline]) expect(parseBot(label).budget.timeMs).toBeUndefined();
      expect(isColours(requirement.colours)).toBe(true);
      expect(requirement.games % 2).toBe(0);
    }
  });
});
