/**
 * Generates the perfect bot's opening book (design: `perfect-bot`, Decisions 3–4). Bot-to-move
 * positions are judged in waves by disc count, on worker threads: a position the browser settles
 * within `SOLVE_NODES` is a leaf; any other is solved fully and stored with its best columns. A won or
 * drawn stored position is followed along its best columns (only the most central one with
 * `--narrow`) and every reply of the other side; a lost one is not followed. Roots: every position
 * with at most two discs, judged together as the first wave. Progress is saved after every judged position under `book/.progress/`, so
 * a stopped run resumes where it was; `--max-plies` stops early (a dry run whose work a later run
 * reuses).
 *
 *   npm run book -w @neljan-suora/bots [-- --jobs 5 --table-bits 24 --max-plies 8 --narrow --out file]
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Worker } from "node:worker_threads";
import { COLUMNS } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { Position } from "../src/negamax/position.js";
import { Book, canonicalKey, writeBook, type BookEntry } from "../src/perfect/book.js";
import { SOLVE_NODES } from "../src/perfect/bot.js";
import type { BookResult } from "./book-worker.js";
import { BOOK_FILE } from "./load-book.js";

const here = dirname(fileURLToPath(import.meta.url));
const BOOK_DIR = join(here, "..", "book");
const PROGRESS_DIR = join(BOOK_DIR, ".progress");
const STATE_FILE = join(PROGRESS_DIR, "state.json");
const CENTRE_ORDER = [3, 2, 4, 1, 5, 0, 6];

const { values } = parseArgs({
  options: {
    jobs: { type: "string", default: String(Math.max(1, availableParallelism() - 1)) },
    "table-bits": { type: "string", default: "24" },
    "max-plies": { type: "string", default: "42" },
    narrow: { type: "boolean", default: false },
    out: { type: "string", default: BOOK_FILE },
  },
});
const jobs = Number(values.jobs);
const maxPlies = Number(values["max-plies"]);
const narrow = values.narrow;

/** Everything a resumed run needs: the stored entries and the positions still to judge, by disc count. */
interface State {
  readonly narrow: boolean;
  readonly solveNodes: number;
  nextWave: number;
  entries: BookEntry[];
  frontiers: Record<number, string[]>;
}

const positionOf = (line: string): Position => Position.fromGame(gameAfter([...line].map(Number)));

/** `line` followed by `column`, or undefined when the column is full or the disc ends the game. */
function extend(line: string, column: number): string | undefined {
  const position = positionOf(line);
  if (!position.canPlay(column) || position.isWinningMove(column) || position.moves >= 41) return undefined;
  return line + column;
}

/** The roots, all judged in the first wave so the long solves of the start run side by side. */
function initialState(): State {
  const frontiers: Record<number, string[]> = { 0: [""] };
  const seen = new Set<number>([canonicalKey(positionOf("")).key]);
  for (const line of ["", ...Array.from({ length: COLUMNS }, (_, c) => String(c))]) {
    for (let column = 0; column < COLUMNS; column++) {
      const next = extend(line, column);
      if (next === undefined) continue;
      const { key } = canonicalKey(positionOf(next));
      if (seen.has(key)) continue;
      seen.add(key);
      frontiers[0]!.push(next);
    }
  }
  return { narrow, solveNodes: SOLVE_NODES, nextWave: 0, entries: [], frontiers };
}

function loadState(): State {
  if (!existsSync(STATE_FILE)) return initialState();
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
  if (state.narrow !== narrow || state.solveNodes !== SOLVE_NODES) {
    throw new Error(`Saved progress was made with narrow=${state.narrow}, solve nodes ${state.solveNodes}; delete ${PROGRESS_DIR} to start over`);
  }
  return state;
}

const saveState = (state: State) => writeFileSync(STATE_FILE, JSON.stringify(state));
const waveFile = (wave: number) => join(PROGRESS_DIR, `wave-${wave}.jsonl`);

/** Worker threads that judge positions, kept for the whole run so their tables stay warm. */
class Pool {
  private readonly workers: Worker[] = [];

  constructor(size: number, tableBits: number) {
    for (let i = 0; i < size; i++) {
      this.workers.push(new Worker(new URL("./book-worker-entry.mjs", import.meta.url), { workerData: { tableBits }, execArgv: ["--conditions=source"] }));
    }
  }

  run(lines: readonly string[], onResult: (result: BookResult) => void): Promise<void> {
    let next = 0;
    let done = 0;
    return new Promise((resolve, reject) => {
      if (lines.length === 0) return resolve();
      for (const worker of this.workers) {
        worker.removeAllListeners("message").removeAllListeners("error");
        worker.on("message", (message: { ok: true; result: BookResult } | { ok: false; error: string }) => {
          if (!message.ok) return reject(new Error(message.error));
          onResult(message.result);
          if (++done === lines.length) resolve();
          else if (next < lines.length) worker.postMessage({ line: lines[next++] });
        });
        worker.on("error", reject);
        if (next < lines.length) worker.postMessage({ line: lines[next++] });
      }
    });
  }

  close(): Promise<number[]> {
    return Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}

/** The stored result: the book entry, and the bot-to-move positions it leads to. */
function follow(state: State, result: Extract<BookResult, { settled: false }>, seen: Set<number>): void {
  const position = positionOf(result.line);
  const { verdict } = result;
  const columns = narrow && verdict.outcome >= 0 ? [CENTRE_ORDER.find((column) => verdict.columns.includes(column))!] : verdict.columns;
  state.entries.push({ ...canonicalKey(position), outcome: verdict.outcome, columns });
  if (verdict.outcome < 0) return;
  for (const column of columns) {
    const child = extend(result.line, column);
    if (child === undefined) continue;
    for (let reply = 0; reply < COLUMNS; reply++) {
      const next = extend(child, reply);
      if (next === undefined) continue;
      const { key } = canonicalKey(positionOf(next));
      if (seen.has(key)) continue;
      seen.add(key);
      (state.frontiers[next.length] ??= []).push(next);
    }
  }
}

/** The theory every book must agree with; throws when it does not. */
function selfCheck(book: Book): void {
  const expected: [string, number, number[] | undefined][] = [
    ["", 1, [3]],
    ["3", -1, undefined],
    ["2", 0, undefined],
    ["4", 0, undefined],
    ["0", 1, undefined],
    ["1", 1, undefined],
    ["5", 1, undefined],
    ["6", 1, undefined],
  ];
  for (const [line, outcome, columns] of expected) {
    const verdict = book.lookup(positionOf(line));
    if (!verdict) throw new Error(`Self-check: "${line || "start"}" is not in the book`);
    if (verdict.outcome !== outcome || (columns && verdict.columns.join() !== columns.join())) {
      throw new Error(`Self-check: "${line || "start"}" is ${JSON.stringify(verdict)}, expected outcome ${outcome}${columns ? ` columns ${columns.join()}` : ""}`);
    }
  }
}

async function main(): Promise<void> {
  mkdirSync(PROGRESS_DIR, { recursive: true });
  const state = loadState();
  const pool = new Pool(jobs, Number(values["table-bits"]));
  const started = Date.now();
  try {
    while (state.nextWave <= maxPlies && Object.values(state.frontiers).some((queued) => queued.length > 0)) {
      const wave = state.nextWave;
      const lines = state.frontiers[wave] ?? [];
      // Positions queued, for de-duplication; results already judged in this wave resume.
      const seen = new Set(Object.entries(state.frontiers).flatMap(([d, queued]) => (Number(d) >= wave ? queued.map((line) => canonicalKey(positionOf(line)).key) : [])));
      const judged = existsSync(waveFile(wave))
        ? readFileSync(waveFile(wave), "utf8").split("\n").filter(Boolean).map((text) => JSON.parse(text) as BookResult)
        : [];
      const done = new Set(judged.map((result) => result.line));
      const waveStarted = Date.now();
      let stored = 0;
      const take = (result: BookResult) => {
        if (!result.settled) {
          stored++;
          follow(state, result, seen);
        }
      };
      judged.forEach(take);
      const todo = lines.filter((line) => !done.has(line));
      let count = judged.length;
      let lastReport = Date.now();
      process.stderr.write(`wave ${wave}: ${lines.length} positions (${judged.length} resumed)\n`);
      await pool.run(todo, (result) => {
        appendFileSync(waveFile(wave), JSON.stringify(result) + "\n");
        take(result);
        count++;
        if (Date.now() - lastReport > 60_000) {
          lastReport = Date.now();
          const perPosition = (Date.now() - waveStarted) / Math.max(1, count - judged.length);
          const eta = Math.round((perPosition * (lines.length - count)) / 60_000);
          process.stderr.write(`  wave ${wave}: ${count}/${lines.length}, ${stored} stored, ~${eta} min left\n`);
        }
      });
      delete state.frontiers[wave];
      state.nextWave = wave + 1;
      saveState(state);
      const next = state.frontiers[wave + 1]?.length ?? 0;
      const after = state.frontiers[wave + 2]?.length ?? 0;
      process.stderr.write(
        `wave ${wave} done in ${Math.round((Date.now() - waveStarted) / 1000)} s: ${stored} stored, ${state.entries.length} in total; queued ${next} + ${after}\n`,
      );
    }
  } finally {
    await pool.close();
  }

  const buffer = writeBook(state.entries, SOLVE_NODES);
  const book = Book.parse(buffer)!;
  selfCheck(book);
  mkdirSync(dirname(values.out), { recursive: true });
  writeFileSync(values.out, new Uint8Array(buffer));
  process.stderr.write(`book: ${book.size} entries, ${(buffer.byteLength / 1e6).toFixed(2)} MB → ${values.out} (${Math.round((Date.now() - started) / 60_000)} min)\n`);
}

await main();
