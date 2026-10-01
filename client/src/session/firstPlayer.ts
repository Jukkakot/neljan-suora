import { firstTurn, type Game, type NeljanSuoraOptions } from "@neljan-suora/rules";

/**
 * Who starts a game against the bot on the device: the person ("Minä", seat 1), the bot ("Botti",
 * seat 2) or drawn from the seed ("Arvonta"). Remembered on the device under its own key: unlike
 * the settings it changes the game, so it is not one of them.
 */
export type FirstPlayer = "me" | "bot" | "random";

export const FIRST_PLAYERS: readonly FirstPlayer[] = ["me", "bot", "random"];

const KEY = "neljan-suora.firstPlayer";

function storageOf(storage?: Storage): Storage | undefined {
  try {
    return storage ?? globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** The remembered choice; "random" before the person has chosen, or when storage is blocked or holds garbage. */
export function loadFirstPlayer(storage?: Storage): FirstPlayer {
  try {
    const value = storageOf(storage)?.getItem(KEY);
    return FIRST_PLAYERS.includes(value as FirstPlayer) ? (value as FirstPlayer) : "random";
  } catch {
    return "random";
  }
}

export function saveFirstPlayer(choice: FirstPlayer, storage?: Storage): void {
  try {
    storageOf(storage)?.setItem(KEY, choice);
  } catch {
    // Storage blocked (private mode): the choice still applies until the page is closed.
  }
}

/** The options of a game against the bot (the person in seat 1, the bot in seat 2) for `choice`. */
export function firstPlayerOptions(choice: FirstPlayer): NeljanSuoraOptions {
  return choice === "me" ? { firstSeat: 1 } : choice === "bot" ? { firstSeat: 2 } : {};
}

/** The rematch's options: the other seat starts than in `previous`, whoever started it and how. */
export function rematchOptions(previous: Game, options: NeljanSuoraOptions): NeljanSuoraOptions {
  const started = firstTurn(previous.seed, previous.seats, options.firstSeat);
  const other = previous.seats.find((seat) => seat !== started) ?? started;
  return { ...options, firstSeat: other };
}
