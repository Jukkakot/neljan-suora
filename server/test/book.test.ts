import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cellsOf, type Book } from "@neljan-suora/bots";
import { createRng, legalColumns, playMove, startGame, type Game } from "@neljan-suora/rules";
import { configureLogger } from "@game-kit/server";
import { loadBook, mountBook } from "../src/book.js";
import { captureLogs } from "./support/captureLogs.js";

const EMPTY = "0".repeat(42);

/** A seeded random game of `discs` discs that is not over and has no winning move, for depth checks. */
function quietGame(discs: number): Game {
  for (let seed = 1; ; seed++) {
    const rng = createRng(seed);
    let game = startGame(seed, [1, 2]);
    while (!game.over && game.moves < discs) {
      const columns = legalColumns(game.cells);
      const result = playMove(game, game.turn, { column: columns[rng.int(0, columns.length - 1)]! });
      if (!result.ok) throw new Error(result.code);
      game = result.game;
    }
    if (game.over) continue;
    const wins = legalColumns(game.cells).some((column) => {
      const result = playMove(game, game.turn, { column });
      return result.ok && result.game.winners.length > 0;
    });
    if (!wins) return game;
  }
}

async function serve(book: Book | undefined) {
  const app = express();
  mountBook(app, book);
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const get = async (cells: string) => {
    const response = await fetch(`${base}/book?cells=${cells}`);
    return { status: response.status, body: (await response.json()) as unknown, cache: response.headers.get("cache-control") };
  };
  return { server, base, get };
}

describe("bots › Opening book on the server", () => {
  let real: Awaited<ReturnType<typeof serve>>;

  beforeAll(async () => {
    real = await serve(loadBook());
  });
  afterAll(() => {
    real.server.close();
    configureLogger();
  });

  it("answers the empty board: the side to move wins in column 3", async () => {
    expect(await real.get(EMPTY)).toEqual({ status: 200, body: { known: true, outcome: 1, columns: [3] }, cache: "public, max-age=86400" });
  });

  it("answers a position deeper than the book as unknown", async () => {
    expect((await real.get(cellsOf(quietGame(20))!)).body).toEqual({ known: false });
  });

  it("refuses positions that cannot arise in a game", async () => {
    for (const cells of [EMPTY.slice(1), `${EMPTY.slice(1)}x`, `01${EMPTY.slice(2)}`, `1${EMPTY.slice(1)}`, "111100" + "0".repeat(24) + "220000220000"]) {
      expect(await real.get(cells), cells).toMatchObject({ status: 400, body: { error: "BAD_POSITION" } });
    }
    expect((await fetch(`${real.base}/book`)).status).toBe(400);
  });

  it("answers every position as unknown when the book file is missing, logging it once", async () => {
    const logs = captureLogs();
    const missing = await serve(loadBook("no-such-dir/7x6.book"));
    try {
      expect((await missing.get(EMPTY)).body).toEqual({ known: false });
      expect(logs.lines().filter((line) => line.kind === "book")).toHaveLength(1);
    } finally {
      missing.server.close();
    }
  });
});
