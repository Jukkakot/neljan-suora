import type { GameClientDefinition, ListingOptions } from "@game-kit/client";
import { BOT_NAMES, type Seat } from "@game-kit/protocol";
import { CELLS, DEFAULT_OPTIONS, SEAT_COUNT, neljanSuoraRules, type Game, type Move, type NeljanSuoraOptions } from "@neljan-suora/rules";
import { botBudget, type AskBot } from "../bots/botMoves.ts";
import { askBotWorker } from "../bots/botWorkerClient.ts";
import { toView, type GameView, type SyncedGame } from "./viewModel.ts";

const isInt = (value: unknown, min: number, max: number): boolean => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const isSeatList = (value: unknown): value is number[] => Array.isArray(value) && value.every((s) => isInt(s, 1, SEAT_COUNT));

/** Throws unless `value` looks like a game of the current rules (an old or broken save is dropped). */
export function checkGame(value: unknown): Game {
  const game = value as Game;
  const ok =
    typeof game === "object" &&
    game !== null &&
    isInt(game.seed, 0, 2 ** 32 - 1) &&
    isSeatList(game.seats) &&
    isSeatList(game.left) &&
    isSeatList(game.winners) &&
    Array.isArray(game.cells) &&
    game.cells.length === CELLS &&
    game.cells.every((c) => isInt(c, 0, SEAT_COUNT)) &&
    Array.isArray(game.line) &&
    isInt(game.turn, 0, SEAT_COUNT) &&
    isInt(game.moves, 0, CELLS) &&
    typeof game.over === "boolean";
  if (!ok) throw new Error("Not a saved game of the current rules");
  return game;
}

/** The `move` payload as a move; undefined when the cell is missing or not an integer. */
function moveOf(payload: unknown): Move | undefined {
  const { cell } = (payload ?? {}) as Record<string, unknown>;
  return Number.isInteger(cell) ? { cell: cell as number } : undefined;
}

/** The game's synced data as the server's `sync` writes it, from the rules' game. */
const childOf = (game: Game): SyncedGame => ({ cells: game.cells, line: game.line });

/** The seats of a device game: the player in seat 1 and a bot, or two bots to watch. */
function localSeats({ nickname }: { nickname?: string }): Seat[] {
  const watch = nickname === undefined;
  const bots = BOT_NAMES.slice(0, watch ? SEAT_COUNT : SEAT_COUNT - 1).map((name, i) => ({ seat: i + (watch ? 1 : 2), name, bot: true }));
  return watch ? bots : [{ seat: 1, name: nickname, bot: false }, ...bots];
}

/**
 * Neljän suora's client part of the game contract, with `askBot` as the source of bot moves (the bot
 * worker in the app, a stub in tests).
 */
export function createNeljanSuoraClient(askBot: AskBot = askBotWorker): GameClientDefinition<Game, Move, NeljanSuoraOptions, GameView> {
  return {
    rules: neljanSuoraRules,
    defaultOptions: DEFAULT_OPTIONS,
    toView,

    askBot(view, speed, seed) {
      if (!view.game) return Promise.resolve(undefined);
      return askBot({ game: view.game, budget: botBudget(speed), seed });
    },

    local: {
      save: { key: "neljan-suora.localGame", check: checkGame },
      seats: localSeats,
      parseMove: moveOf,
      askBot: (game, speed) => askBot({ game, budget: botBudget(speed), seed: (game.seed + game.moves) % 2 ** 32 }),
      child: childOf,
      turn: (game) => game.moves + 1,
      logFacts: (game) => ({ dealSeed: game.seed, moves: game.moves }),
    },
  };
}

/** Neljän suora's client definition with the bot worker. */
export const neljanSuoraClient = createNeljanSuoraClient();

/** How the open-games list reads a listing's options: none yet, and the game's seats. */
export const neljanSuoraListing: ListingOptions<NeljanSuoraOptions> = {
  options: () => DEFAULT_OPTIONS,
  maxSeats: () => SEAT_COUNT,
};
