import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Application } from "express";
import { rateLimit } from "express-rate-limit";
import { Book, positionFromCells } from "@neljan-suora/bots";
import { log } from "@game-kit/server";

/** Pons' `7x6.book` as the bots package ships it. */
export const BOOK_FILE = createRequire(import.meta.url).resolve("@neljan-suora/bots/book");

/** Per IP: a fast watched bot game asks about once a second, hints a few more. */
export const BOOK_RATE = { windowMs: 60_000, limit: 120 };

/**
 * The opening book read from `file`, or undefined (logged once) when it is missing or not a book:
 * the route then answers every position as unknown and games go on without it.
 */
export function loadBook(file: string = BOOK_FILE): Book | undefined {
  try {
    const bytes = readFileSync(file);
    const book = Book.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    if (book) return book;
    log.warn("framework.log", { kind: "book" }, `not an opening book: ${file}`);
  } catch (error) {
    log.warn("framework.log", { kind: "book" }, `opening book unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  return undefined;
}

/**
 * `GET /book?cells=<42 digits>`: the verdict of the position for the side to move,
 * `{known:true, outcome, columns}` or `{known:false}`; `400 {error:"BAD_POSITION"}` for a position
 * that cannot arise in a game that is not over. Answers never change while the book is the same.
 */
export function mountBook(app: Application, book: Book | undefined): void {
  const limiter = rateLimit({ ...BOOK_RATE, standardHeaders: "draft-8", legacyHeaders: false });
  app.get("/book", limiter, (req, res) => {
    const cells = req.query.cells;
    const position = typeof cells === "string" ? positionFromCells(cells) : undefined;
    if (!position) {
      res.status(400).json({ error: "BAD_POSITION" });
      return;
    }
    const verdict = book?.lookup(position);
    res.set("Cache-Control", "public, max-age=86400");
    res.json(verdict ? { known: true, outcome: verdict.outcome, columns: verdict.columns } : { known: false });
  });
}
