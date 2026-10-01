/**
 * Measures the searchers once: the depth reached and nodes per second within a time budget, in the
 * opening and the middle game, for the game's negamax and the kit's best-reply search at full width.
 *
 * With `--solver`, instead: the perfect bot's solver, the nodes it needs to settle positions sampled
 * at plies 6–16 (depth-4 self-play after a random opening), capped at `--cap` nodes per position.
 *
 *   npm run bench -w @neljan-suora/bots [-- --ms 800] [-- --solver --cap 50000000]
 */
import { parseArgs } from "node:util";
import { bestReplyBot } from "@game-kit/bots";
import { createRng, startGame } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { evaluate, negamaxBot, negamaxPlayer, neljanSuoraGame, openedGame, playGame } from "../src/index.js";
import { Position } from "../src/negamax/position.js";
import { Solver } from "../src/perfect/solve.js";

const { values } = parseArgs({
  options: { ms: { type: "string", default: "800" }, solver: { type: "boolean", default: false }, cap: { type: "string", default: "50000000" } },
});
const timeMs = Number(values.ms);

if (values.solver) {
  benchSolver(Number(values.cap));
  process.exit(0);
}

function benchSolver(cap: number): void {
  const solver = new Solver(22);
  for (const ply of [16, 14, 12, 10, 8, 6]) {
    const needed: number[] = [];
    let nodes = 0;
    let ms = 0;
    for (let seed = 1; needed.length < 20; seed++) {
      const game = playGame(openedGame(seed, [1, 2]), { 1: negamaxPlayer, 2: negamaxPlayer }, seed, { depth: 4 })[ply - 2];
      if (!game || game.over) continue;
      const started = performance.now();
      const verdict = solver.solveRoot(Position.fromGame(game), { nodes: cap });
      ms += performance.now() - started;
      nodes += solver.nodes;
      needed.push(verdict ? solver.nodes : Infinity);
    }
    needed.sort((a, b) => a - b);
    const at = (q: number) => needed[Math.min(needed.length - 1, Math.floor(q * needed.length))]!;
    console.log(
      `ply ${ply}: median ${at(0.5)}, p80 ${at(0.8)}, p95 ${at(0.95)}, max ${at(1)} nodes; ` +
        `${needed.filter((n) => n === Infinity).length} over the cap; ${Math.round((nodes / ms) * 1000)} nodes/s`,
    );
  }
}

const positions = {
  opening: gameAfter([3]),
  // Twelve discs of depth-4 self-play.
  "middle game": playGame(startGame(1, [1, 2]), { 1: negamaxPlayer, 2: negamaxPlayer }, 1, { depth: 4 })[12]!,
};

for (const [name, game] of Object.entries(positions)) {
  let negamax = { depth: 0, nodes: 0, score: 0 };
  const bot = negamaxBot({ report: (info) => (negamax = info) });
  bot.choose(game, { depth: 1 }, createRng(1));
  const started = performance.now();
  const column = bot.choose(game, { timeMs }, createRng(1));
  const ms = performance.now() - started;
  const perSecond = Math.round((negamax.nodes / ms) * 1000);
  console.log(`${name}: negamax depth ${negamax.depth}, ${negamax.nodes} nodes in ${ms.toFixed(0)} ms (${perSecond}/s), column ${column}, score ${negamax.score}`);

  let brsDepth = 0;
  const brs = bestReplyBot(neljanSuoraGame, evaluate, { rootWidth: 7, width: 7, replyWidth: 7, report: ({ depth }) => (brsDepth = depth) });
  const brsStarted = performance.now();
  const brsColumn = brs.choose(game, { timeMs }, createRng(1));
  console.log(`${name}: kit best-reply (full width) depth ${brsDepth} in ${(performance.now() - brsStarted).toFixed(0)} ms, column ${brsColumn}`);
}
