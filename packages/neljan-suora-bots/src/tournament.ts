import { createRng, playMove, startGame, type Game } from "@neljan-suora/rules";
import { systemClock, type Bot, type Budget, type GameResult, type MoveTiming, type ScheduledGame } from "@game-kit/bots";
import { brsPlayer, greedyPlayer, mctsPlayer, randomPlayer } from "./adapter.js";

/** A bot a tournament can use, with the budget it gets when its name carries none. */
interface RegisteredBot {
  readonly bot: Bot<Game, number>;
  readonly budget: Budget;
}

/** The known bots by name. */
export const BOTS: Readonly<Record<string, RegisteredBot>> = {
  random: { bot: randomPlayer, budget: { depth: 1 } },
  greedy: { bot: greedyPlayer, budget: { depth: 1 } },
  brs: { bot: brsPlayer, budget: { depth: 9 } },
  mcts: { bot: mctsPlayer, budget: { iterations: 400 } },
};

/** A bot as named in a tournament: `greedy`, `greedy@200ms` (time limit), `brs@d2` (depth) or `mcts@i400` (iterations). */
export interface TournamentBot {
  /** The full name as given; it identifies the bot in results and reports. */
  readonly label: string;
  readonly name: string;
  readonly bot: Bot<Game, number>;
  readonly budget: Budget;
}

/** Parses a bot name with an optional budget; throws with the known names listed when it is not valid. */
export function parseBot(label: string): TournamentBot {
  const match = /^([a-z][a-z0-9-]*)(?:@(?:(\d+)ms|d(\d+)|i(\d+)))?$/.exec(label);
  const known = Object.keys(BOTS).join(", ");
  if (!match) throw new RangeError(`Bot "${label}" is not valid: use a name, name@<n>ms, name@d<n> or name@i<n>. Known bots: ${known}`);
  const [, name, ms, depth, iterations] = match;
  const registered = BOTS[name!];
  if (!registered) throw new RangeError(`Unknown bot "${name}". Known bots: ${known}`);
  const budget: Budget =
    ms !== undefined
      ? { timeMs: Number(ms) }
      : depth !== undefined
        ? { depth: Number(depth) }
        : iterations !== undefined
          ? { iterations: Number(iterations) }
          : registered.budget;
  if ((budget.timeMs ?? 1) < 1 || (budget.depth ?? 1) < 1 || (budget.iterations ?? 1) < 1) {
    throw new RangeError(`Bot "${label}" needs a budget of at least 1`);
  }
  return { label, name: name!, bot: registered.bot, budget };
}

/** Tournament formats (`--colours`): the seats each side of a pairing plays. The placeholder has one. */
export const FORMATS = {
  /** Two seats, one each. */
  2: { description: "2 seats", sides: [[1], [2]] },
} as const satisfies Record<number | string, { description: string; sides: readonly [readonly number[], readonly number[]] }>;

export type Colours = keyof typeof FORMATS;

const FORMAT_NAMES = Object.keys(FORMATS).join(", ");

/** Whether `value` names a format (a number or a digit string). */
export function isColours(value: unknown): value is Colours {
  return (typeof value === "number" || typeof value === "string") && Object.hasOwn(FORMATS, value);
}

/** A `--colours` option value as a format; throws with the allowed values when it is not one. */
export function parseColours(value: string): Colours {
  const colours = /^\d+$/.test(value) ? Number(value) : value;
  if (!isColours(colours)) throw new RangeError(`--colours must be one of ${FORMAT_NAMES}, got ${value}`);
  return Number(colours) as Colours;
}

/** A played game plus how long each bot took per move. */
export interface PlayedGame {
  readonly result: GameResult;
  readonly timing: Record<string, MoveTiming>;
}

/**
 * Plays one scheduled game: the pairing's first bot takes the format's first side (the second when
 * swapped); the game's seed draws who starts; every bot gets its own budget; one rng seeded by the
 * game's seed. Seats in the result are the seats in order, each with its bot's label and 1 for a
 * win, 0 otherwise.
 */
export function playTournamentGame(colours: Colours, bots: ReadonlyMap<string, TournamentBot>, game: ScheduledGame): PlayedGame {
  const [first, second] = game.swapped ? [game.pairing[1], game.pairing[0]] : game.pairing;
  const [sideA, sideB] = FORMATS[colours].sides;
  const bySeat = new Map<number, TournamentBot>();
  for (const [label, side] of [[first, sideA], [second, sideB]] as const) {
    const bot = bots.get(label);
    if (!bot) throw new RangeError(`Bot ${label} is not in the tournament`);
    for (const seat of side) bySeat.set(seat, bot);
  }

  const timing: Record<string, { moves: number; totalMs: number; maxMs: number }> = {};
  const rng = createRng(game.seed);
  const seats = [...bySeat.keys()].sort((a, b) => a - b);
  let state = startGame(game.seed, seats);
  while (!state.over) {
    const player = bySeat.get(state.turn)!;
    const started = systemClock();
    const cell = player.bot.choose(state, player.budget, rng);
    const ms = systemClock() - started;
    if (cell === undefined) throw new Error(`${player.label} on seat ${state.turn} has no move`);
    const applied = playMove(state, state.turn, { cell });
    if (!applied.ok) throw new Error(`${player.label} played a refused move: ${applied.code}`);
    state = applied.game;
    const t = (timing[player.label] ??= { moves: 0, totalMs: 0, maxMs: 0 });
    t.moves++;
    t.totalMs += ms;
    t.maxMs = Math.max(t.maxMs, ms);
  }

  return {
    result: { ...game, seats: seats.map((s) => bySeat.get(s)!.label), scores: seats.map((s) => (state.winners.includes(s) ? 1 : 0)) },
    timing,
  };
}

/** Adds one game's timing into running totals. */
export function addTiming(totals: Map<string, MoveTiming>, timing: Readonly<Record<string, MoveTiming>>): void {
  for (const [bot, t] of Object.entries(timing)) {
    const sum = totals.get(bot) ?? { moves: 0, totalMs: 0, maxMs: 0 };
    totals.set(bot, { moves: sum.moves + t.moves, totalMs: sum.totalMs + t.totalMs, maxMs: Math.max(sum.maxMs, t.maxMs) });
  }
}

/** Whether any bot plays with a time limit (the results then depend on the machine). */
export function isTimeLimited(bots: Iterable<TournamentBot>): boolean {
  for (const bot of bots) if (bot.budget.timeMs !== undefined) return true;
  return false;
}
