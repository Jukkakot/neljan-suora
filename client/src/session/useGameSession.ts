import {
  createConnector as createKitConnector,
  noticeKey as kitNoticeKey,
  useKitSession,
  type Connector as KitConnector,
  type KitSession,
} from "@game-kit/client";
import { GAME_ERROR_CODES, type BotSpeed, type CommandResult, type GameErrorCode, type MovePayload } from "@neljan-suora/protocol";
import { SEAT_COUNT, type NeljanSuoraOptions } from "@neljan-suora/rules";
import { useCallback } from "react";
import { firstPlayerOptions, loadFirstPlayer, type FirstPlayer } from "./firstPlayer.ts";
import { neljanSuoraClient } from "./neljanSuoraClient.ts";
import type { GameView } from "./viewModel.ts";

export {
  joinFailure,
  NOTICE_MS,
  quickPlayPool,
  RESUME_TOUCH_MS,
  sdkClient,
  SLOW_CONNECT_MS,
  type GameRoomLike,
  type JoinRequest,
  type SessionStatus,
  type StartNotice,
} from "@game-kit/client";

/** Neljän suora's connector: device games with the game's options. */
export type Connector = KitConnector<NeljanSuoraOptions>;

/** The connector with Neljän suora's client definition. */
export const createConnector = (): Connector => createKitConnector(neljanSuoraClient);

export type NoticeKey = `errors.${GameErrorCode}` | "errors.generic" | "spectate.lateInvite";

/** i18n key for a rejection code: `errors.<CODE>` for known game codes, else `errors.generic`. */
export function noticeKey(code: string): NoticeKey {
  return kitNoticeKey(code, GAME_ERROR_CODES) as NoticeKey;
}

export interface GameSession extends Omit<KitSession<GameView, NeljanSuoraOptions>, "playBots" | "watchBots" | "notice" | "command"> {
  /** A quick game against a bot on the device, straight into the game; `first` starts (default: the remembered choice). */
  playBots(nickname: string, first?: FirstPlayer): void;
  /** Watches a new game of two bots on the device (leaving the current game, if any). */
  watchBots(nickname: string, speed?: BotSpeed): void;
  /** Makes a move (the whole turn). Resolves undefined without sending while another command is pending. */
  move(move: MovePayload): Promise<CommandResult | undefined>;
  /** i18n key of the message for the last rejected command, shown for NOTICE_MS. */
  notice?: NoticeKey;
}

/**
 * Neljän suora's session: the kit's session with the game's definition, plus making a move (`move`).
 * A tab with a stored reconnection token rejoins its game on load; otherwise it waits for
 * createGame(), joinById() or another way in.
 */
export function useGameSession(connector?: Connector): GameSession {
  const { command, playBots: kitPlayBots, watchBots: kitWatchBots, notice, ...session } = useKitSession({
    definition: neljanSuoraClient,
    errorCodes: GAME_ERROR_CODES,
    connector,
  });
  const playBots = useCallback(
    (nickname: string, first = loadFirstPlayer()) => kitPlayBots(nickname, SEAT_COUNT - 1, firstPlayerOptions(first)),
    [kitPlayBots],
  );
  const watchBots = useCallback((nickname: string, speed?: BotSpeed) => kitWatchBots(nickname, SEAT_COUNT, speed), [kitWatchBots]);
  const move = useCallback(({ column }: MovePayload) => command("move", { move: { column } }), [command]);
  return { ...session, playBots, watchBots, move, notice: notice as NoticeKey | undefined };
}
