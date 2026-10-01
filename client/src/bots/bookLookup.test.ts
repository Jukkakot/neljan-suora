import { describe, expect, it, vi } from "vitest";
import type { ExplainedMove } from "@neljan-suora/bots";
import { gameAfter } from "@neljan-suora/rules/testing";
import { botBudget, type MoveRequest } from "./botMoves.ts";
import { BOOK_MAX_DISCS, LOOKUP_TIMEOUT_MS, verdictOf, withBookLookup, type LookupDeps } from "./bookLookup.ts";
import { explanationOf, recording } from "./explanations.ts";

const question = (columns: number[] = []) => ({ game: gameAfter(columns), budget: { depth: 1 }, seed: 1 });

function setup(get: LookupDeps["get"]) {
  const ask = vi.fn((_request: MoveRequest) => Promise.resolve<ExplainedMove>({ move: { column: 3 }, how: { source: "book", outcome: 1 } }));
  const onFailure = vi.fn();
  const getSpy = vi.fn(get);
  return { ask, onFailure, get: getSpy, wrapped: withBookLookup(ask, { get: getSpy, onFailure }) };
}

describe("opening book lookup", () => {
  it("asks the server and hands the verdict to the bot", async () => {
    const { ask, get, wrapped } = setup(() => Promise.resolve({ known: true, outcome: 1, columns: [3] }));
    await wrapped(question());
    expect(get).toHaveBeenCalledExactlyOnceWith(`/book?cells=${"0".repeat(42)}`, LOOKUP_TIMEOUT_MS);
    expect(ask.mock.calls[0]![0].verdict).toEqual({ outcome: 1, columns: [3] });
  });

  it("asks without a verdict when the book does not hold the position", async () => {
    const { ask, onFailure, wrapped } = setup(() => Promise.resolve({ known: false }));
    await wrapped(question([3]));
    expect(ask.mock.calls[0]![0].verdict).toBeUndefined();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("goes on without the book on a failure or timeout, warning once per visit", async () => {
    const { ask, onFailure, wrapped } = setup(() => Promise.reject(new Error("The operation timed out.")));
    await expect(wrapped(question())).resolves.toMatchObject({ move: { column: 3 } });
    await wrapped(question([3]));
    expect(ask.mock.calls.every(([request]) => request.verdict === undefined)).toBe(true);
    expect(onFailure).toHaveBeenCalledExactlyOnceWith("The operation timed out.");
  });

  it("does not ask past the book's depth", async () => {
    const columns = [0, 0, 1, 1, 2, 2, 4, 4, 5, 5, 6, 6, 0, 0];
    const { get, wrapped } = setup(() => Promise.resolve({ known: false }));
    await wrapped(question(columns.slice(0, BOOK_MAX_DISCS)));
    expect(get).toHaveBeenCalledOnce();
    await wrapped(question(columns.slice(0, BOOK_MAX_DISCS + 1)));
    expect(get).toHaveBeenCalledOnce();
  });

  it("reads only well-formed answers", () => {
    expect(verdictOf({ known: true, outcome: 0, columns: [2, 4] })).toEqual({ outcome: 0, columns: [2, 4] });
    expect(verdictOf({ known: false })).toBeUndefined();
    for (const bad of [null, "x", { known: true, outcome: 2, columns: [3] }, { known: true, outcome: 1, columns: [] }, { known: true, outcome: 1, columns: [7] }]) {
      expect(() => verdictOf(bad)).toThrow();
    }
  });
});

describe("bot move explanations", () => {
  it("are kept for the state the move led to only", async () => {
    const game = gameAfter([3], 1, 77);
    const ask = recording(() => Promise.resolve({ move: { column: 2 }, how: { source: "solve", outcome: -1 } }));
    await expect(ask({ game, budget: { depth: 1 }, seed: 1 })).resolves.toEqual({ column: 2 });
    expect(explanationOf(gameAfter([3, 2], 1, 77).cells)).toEqual({ seat: game.turn, how: { source: "solve", outcome: -1 } });
    expect(explanationOf(game.cells)).toBeUndefined();
    expect(explanationOf(gameAfter([3, 4], 1, 77).cells)).toBeUndefined();
  });
});

describe("bot budget", () => {
  it("divides the time and the solve by the watching speed", () => {
    expect(botBudget()).toEqual({ timeMs: 3000, iterations: 1_500_000 });
    expect(botBudget(2)).toEqual({ timeMs: 1500, iterations: 750_000 });
  });
});
