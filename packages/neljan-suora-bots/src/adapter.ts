import { createRng, legalColumns, playMove, type Game, type Move, type Rng } from "@neljan-suora/rules";
import { bestReplyBot, greedyBot, mctsBot, randomBot, type Bot, type Budget, type MultiplayerGame } from "@game-kit/bots";
import { evaluate } from "./evaluation.js";
import { negamaxBot } from "./negamax/search.js";

/** `seat` drops a disc into `column`, on turn or not (search may play out of turn). */
function played(game: Game, seat: number, column: number): Game {
  const result = playMove({ ...game, turn: seat }, seat, { column });
  if (!result.ok) throw new Error(`Bot move col${column} for seat ${seat} refused: ${result.code}`);
  return result.game;
}

/** Centre first, then outwards: a cheap move order for search (higher is tried first). */
const COLUMN_KEYS = [0, 1, 2, 3, 2, 1, 0];

/**
 * Neljän suora as the bot library sees it: the rules' game as the state, the column as the move and
 * the seat as the player. The adapter turns the rules into the library's game interface; the
 * evaluation rates a state.
 */
export const neljanSuoraGame: MultiplayerGame<Game, number, number> = {
  toMove: (game) => game.turn,
  isOver: (game) => game.over,
  moves: (game) => (game.over ? [] : legalColumns(game.cells)),
  play: (game, column) => played(game, game.turn, column),
  players(game) {
    if (game.over) return [];
    const from = game.seats.indexOf(game.turn);
    return game.seats.map((_, step) => game.seats[(from + step + 1) % game.seats.length]!);
  },
  movesOf: (game, seat) => (game.over || !game.seats.includes(seat) ? [] : legalColumns(game.cells)),
  playAs: played,
  moveKey: (_game, _seat, column) => COLUMN_KEYS[column] ?? 0,
};

/** One ply, greedy on `evaluate`: takes a win, but does not see the other's threat. */
export const greedyPlayer: Bot<Game, number> = greedyBot(neljanSuoraGame, evaluate);

/** Best-reply search on `evaluate`. */
export const brsPlayer: Bot<Game, number> = bestReplyBot(neljanSuoraGame, evaluate);

/** Multi-player MCTS on `evaluate`. */
export const mctsPlayer: Bot<Game, number> = mctsBot(neljanSuoraGame, evaluate);

/** Uniformly random legal moves: the baseline for tests and tournaments. */
export const randomPlayer: Bot<Game, number> = randomBot(neljanSuoraGame);

/** Negamax on the game's bitboards (`bot-v1`): the strongest bot. */
export const negamaxPlayer: Bot<Game, number> = negamaxBot();

/** The bot people play against. */
export const devicePlayer: Bot<Game, number> = negamaxPlayer;

/**
 * The bot worker's entry point: the move of the seat on turn in `game` within `budget`, or
 * undefined when the game is over. Deterministic for a given seed (a number) or rng, as long as a
 * time budget does not run out.
 */
export function chooseMove(game: Game, budget: Budget, rng: Rng | number, bot: Bot<Game, number> = devicePlayer): Move | undefined {
  if (game.over) return undefined;
  const column = bot.choose(game, budget, typeof rng === "number" ? createRng(rng) : rng);
  return column === undefined ? undefined : { column };
}
