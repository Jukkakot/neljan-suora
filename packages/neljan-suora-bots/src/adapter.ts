import { createRng, freeCells, playMove, type Game, type Move, type Rng } from "@neljan-suora/rules";
import { bestReplyBot, greedyBot, mctsBot, randomBot, type Bot, type Budget, type MultiplayerGame } from "@game-kit/bots";
import { evaluate } from "./evaluation.js";

/** `seat` marks `cell`, on turn or not (search may play out of turn). */
function played(game: Game, seat: number, cell: number): Game {
  const result = playMove({ ...game, turn: seat }, seat, { cell });
  if (!result.ok) throw new Error(`Bot move c${cell} for seat ${seat} refused: ${result.code}`);
  return result.game;
}

/** Centre first, then the corners, then the edges: a cheap move order for search. */
const CELL_KEYS = [1, 0, 1, 0, 2, 0, 1, 0, 1];

/**
 * Neljän suora as the bot library sees it: the rules' game as the state, the cell as the move and
 * the seat as the player. The pattern to copy for the real game: the adapter turns the rules into
 * the library's game interface; the evaluation rates a state.
 */
export const neljanSuoraGame: MultiplayerGame<Game, number, number> = {
  toMove: (game) => game.turn,
  isOver: (game) => game.over,
  moves: (game) => (game.over ? [] : freeCells(game.cells)),
  play: (game, cell) => played(game, game.turn, cell),
  players(game) {
    if (game.over) return [];
    const from = game.seats.indexOf(game.turn);
    return game.seats.map((_, step) => game.seats[(from + step + 1) % game.seats.length]!);
  },
  movesOf: (game, seat) => (game.over || !game.seats.includes(seat) ? [] : freeCells(game.cells)),
  playAs: played,
  moveKey: (_game, _seat, cell) => CELL_KEYS[cell] ?? 0,
};

/** One ply, greedy on `evaluate`: takes a win, but does not see the other's threat. */
export const greedyPlayer: Bot<Game, number> = greedyBot(neljanSuoraGame, evaluate);

/** Best-reply search on `evaluate`. */
export const brsPlayer: Bot<Game, number> = bestReplyBot(neljanSuoraGame, evaluate);

/** Multi-player MCTS on `evaluate`. */
export const mctsPlayer: Bot<Game, number> = mctsBot(neljanSuoraGame, evaluate);

/** Uniformly random legal moves: the baseline for tests and tournaments. */
export const randomPlayer: Bot<Game, number> = randomBot(neljanSuoraGame);

/** The bot people play against. */
export const devicePlayer: Bot<Game, number> = brsPlayer;

/**
 * The bot worker's entry point: the move of the seat on turn in `game` within `budget`, or
 * undefined when the game is over. Deterministic for a given seed (a number) or rng, as long as a
 * time budget does not run out.
 */
export function chooseMove(game: Game, budget: Budget, rng: Rng | number, bot: Bot<Game, number> = devicePlayer): Move | undefined {
  if (game.over) return undefined;
  const cell = bot.choose(game, budget, typeof rng === "number" ? createRng(rng) : rng);
  return cell === undefined ? undefined : { cell };
}
