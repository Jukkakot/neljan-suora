import { describe, expect, it, vi } from "vitest";
import { startGame } from "@neljan-suora/rules";
import { botBudget, type AskBot, type MoveRequest } from "./botMoves.ts";
import { withOpeningBook } from "./openingBook.ts";

const request: MoveRequest = { game: startGame(1, [1, 2]), budget: { depth: 1 }, seed: 1 };
const noWait = () => Promise.resolve();

function setup(load: () => Promise<ArrayBuffer | undefined>, enabled = true) {
  const ask = vi.fn<AskBot>(() => Promise.resolve({ column: 3 }));
  const onFailure = vi.fn();
  const load_ = vi.fn(load);
  return { ask, onFailure, load: load_, wrapped: withOpeningBook(ask, { load: load_, onFailure, enabled, wait: noWait }) };
}

describe("opening book loading", () => {
  it("fetches on the first question, not before, and hands the book over once", async () => {
    const book = new ArrayBuffer(16);
    const { ask, load, wrapped } = setup(() => Promise.resolve(book));
    expect(load).not.toHaveBeenCalled();
    await wrapped(request);
    await wrapped(request);
    await wrapped(request);
    expect(load).toHaveBeenCalledOnce();
    const books = ask.mock.calls.map(([asked]) => asked.book);
    expect(books.filter(Boolean)).toEqual([book]);
  });

  it("logs a failed fetch once and keeps answering without a book", async () => {
    const { ask, onFailure, load, wrapped } = setup(() => Promise.reject(new Error("offline")));
    await expect(wrapped(request)).resolves.toEqual({ column: 3 });
    await expect(wrapped(request)).resolves.toEqual({ column: 3 });
    expect(load).toHaveBeenCalledOnce();
    expect(onFailure).toHaveBeenCalledExactlyOnceWith("offline");
    expect(ask.mock.calls.every(([asked]) => asked.book === undefined)).toBe(true);
  });

  it("does not fetch where no worker keeps the book", async () => {
    const { load, wrapped } = setup(() => Promise.resolve(new ArrayBuffer(16)), false);
    await wrapped(request);
    expect(load).not.toHaveBeenCalled();
  });

  it("asks without the book when it is slower than the first wait", async () => {
    const ask = vi.fn<AskBot>(() => Promise.resolve({ column: 3 }));
    const wrapped = withOpeningBook(ask, { load: () => new Promise(() => {}), onFailure: vi.fn(), enabled: true, wait: noWait });
    await wrapped(request);
    expect(ask.mock.calls[0]![0].book).toBeUndefined();
  });
});

describe("bot budget", () => {
  it("divides the time and the solve by the watching speed", () => {
    expect(botBudget()).toEqual({ timeMs: 3000, iterations: 1_500_000 });
    expect(botBudget(2)).toEqual({ timeMs: 1500, iterations: 750_000 });
  });
});
