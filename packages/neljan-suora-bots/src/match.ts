import { createRng, playMove, type Game } from "@neljan-suora/rules";
import type { Bot, Budget } from "@game-kit/bots";

/**
 * Plays a whole game from `start` with one bot per seat and one seeded rng for the game. Returns
 * every game state on the way, the start included. For tests and tournaments.
 */
export function playGame(start: Game, bots: Readonly<Record<number, Bot<Game, number>>>, seed: number, budget: Budget = { depth: 1 }): Game[] {
  const rng = createRng(seed);
  const states = [start];
  let game = start;
  while (!game.over) {
    const bot = bots[game.turn];
    if (!bot) throw new Error(`No bot for seat ${game.turn}`);
    const cell = bot.choose(game, budget, rng);
    if (cell === undefined) throw new Error(`Seat ${game.turn} on turn but its bot has no move`);
    const result = playMove(game, game.turn, { cell });
    if (!result.ok) throw new Error(`Bot move refused: ${result.code}`);
    game = result.game;
    states.push(game);
  }
  return states;
}
