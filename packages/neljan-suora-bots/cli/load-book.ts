import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Book } from "../src/perfect/book.js";
import { tournamentPerfect } from "../src/tournament.js";

/** The committed opening book file (Pons' 7x6.book). */
export const BOOK_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "book", "7x6.book");

/** The opening book read from disk (tournaments, benchmarks), or undefined when there is none. */
export function loadBook(file = BOOK_FILE): Book | undefined {
  if (!existsSync(file)) return undefined;
  const bytes = readFileSync(file);
  return Book.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

/** Gives the tournaments' perfect bot the book from disk (once per thread). */
export function giveTournamentsTheBook(): void {
  tournamentPerfect.setBook(loadBook());
}
