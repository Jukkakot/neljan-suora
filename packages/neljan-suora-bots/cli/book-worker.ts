import { parentPort, workerData } from "node:worker_threads";
import { gameAfter } from "@neljan-suora/rules/testing";
import { Position } from "../src/negamax/position.js";
import { SOLVE_NODES } from "../src/perfect/bot.js";
import { Solver, type RootVerdict } from "../src/perfect/solve.js";
import { loadOracle } from "./oracle.js";

/** A position to judge, by the columns played from the start. */
export interface BookTask {
  readonly line: string;
}

/** Settled within the browser's budget (a leaf, not stored), or its full verdict. */
export type BookResult = { readonly line: string; readonly settled: true } | { readonly line: string; readonly settled: false; readonly verdict: RootVerdict; readonly nodes: number };

/** Judges one position: first as the browser would (fresh table, `SOLVE_NODES`), then fully. */
export function judge(task: BookTask, quick: Solver, full: Solver): BookResult {
  const position = Position.fromGame(gameAfter([...task.line].map(Number)));
  if (quick.solveRoot(position, { nodes: SOLVE_NODES })) return { line: task.line, settled: true };
  const verdict = full.solveRoot(position, {}, true)!;
  return { line: task.line, settled: false, verdict, nodes: full.nodes };
}

if (parentPort) {
  const port = parentPort;
  const { tableBits } = workerData as { tableBits: number };
  const quick = new Solver();
  // The 8-disc database (when downloaded) ends the full solves of shallow positions early.
  const full = new Solver(tableBits, loadOracle());
  port.on("message", (task: BookTask) => {
    try {
      port.postMessage({ ok: true, result: judge(task, quick, full) });
    } catch (error) {
      port.postMessage({ ok: false, error: error instanceof Error ? (error.stack ?? error.message) : String(error) });
    }
  });
}
