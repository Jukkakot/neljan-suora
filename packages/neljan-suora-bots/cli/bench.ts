/**
 * Measures the searchers once: the depth reached and nodes per second within a time budget, in the
 * opening and the middle game, for the game's negamax and the kit's best-reply search at full width.
 *
 *   npm run bench -w @neljan-suora/bots [-- --ms 800]
 */
import { parseArgs } from "node:util";
import { bestReplyBot } from "@game-kit/bots";
import { createRng, startGame } from "@neljan-suora/rules";
import { gameAfter } from "@neljan-suora/rules/testing";
import { evaluate, negamaxBot, negamaxPlayer, neljanSuoraGame, playGame } from "../src/index.js";

const { values } = parseArgs({ options: { ms: { type: "string", default: "800" } } });
const timeMs = Number(values.ms);

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
