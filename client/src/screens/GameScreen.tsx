import { useEffect, useState } from "react";
import { chooseMove } from "@neljan-suora/bots";
import type { BotSpeed } from "@neljan-suora/protocol";
import { useTranslation } from "react-i18next";
import { AutoplayButton, AutoplayPanel } from "../game/AutoplayControls.tsx";
import { Board } from "../game/Board.tsx";
import { GameIdBadge } from "../game/GameIdBadge.tsx";
import { GameOverControls } from "../game/GameOverControls.tsx";
import { KickControl } from "../game/KickControl.tsx";
import { LeaveButton, LeaveConfirm } from "../game/LeaveControls.tsx";
import { MoveControls } from "../game/MoveControls.tsx";
import { PlayerStrip } from "../game/PlayerStrip.tsx";
import { ResultTable } from "../game/ResultTable.tsx";
import { SpectatorCount, SpectatorPanel } from "../game/SpectatorControls.tsx";
import { TurnLine } from "../game/TurnLine.tsx";
import { useEnded, useLastMove } from "../motion/hooks.ts";
import { LeafFall } from "../motion/LeafFall.tsx";
import { NOTICE_MS, type GameSession } from "../session/useGameSession.ts";
import type { GameView } from "../session/viewModel.ts";
import { SettingsButton, SettingsScreen } from "../settings/SettingsScreen.tsx";
import { useTurnAlert } from "../settings/turnAlert.ts";
import { FirstGameTips } from "../tips/FirstGameTips.tsx";
import { Notice } from "../ui/Notice.tsx";
import { Screen } from "../ui/Screen.tsx";
import styles from "./GameScreen.module.css";

export interface GameScreenProps {
  view: GameView;
  session: Pick<GameSession, "move" | "kick" | "leave" | "pending" | "notice" | "setSpeed" | "rematch" | "rematching" | "watchBots" | "nickname"> &
    // Only some games use these.
    Partial<Pick<GameSession, "undo" | "setAutoplay">>;
}

/**
 * The game's shell around the board: whose turn it is, the players, the board, the controls and the
 * result. On the viewer's turn they tap a column to choose it and confirm with a second tap or the
 * confirm button (one deliberate confirm per move); "Vihje" chooses the bot's column for them.
 * Against bots on the device "Peru" takes back the viewer's last move. A finished game shows the
 * result table with "Pelaa uudelleen" and "Alkuun". A spectator gets no turn controls: the bots'
 * speed while only bots play, and "Uusi bottipeli" after a bot-only game. Once the current player's
 * time is up, the others get the kick control, and anyone leaving is announced by nickname. The top
 * bar's leave action asks first in a running game (in place of the controls) and leaves a finished
 * game at once.
 */
export function GameScreen({ view, session }: GameScreenProps) {
  const { t } = useTranslation();
  const { move, kick, leave, pending, notice, setSpeed, setAutoplay, rematch, rematching, watchBots, nickname, undo } = session;
  const [leaving, setLeaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useTurnAlert(view);

  const { isMyTurn, mySeat } = view;
  // The column the viewer chose on this turn; forgotten when the turn changes or the column fills.
  const [choice, setChoice] = useState<{ turn: number; column: number }>();
  const chosen = choice?.turn === view.turn && isMyTurn && view.board[choice.column] === 0 ? choice.column : undefined;
  const lastMove = useLastMove(view.board, view.roomId);
  const shownLastMove = view.finished ? undefined : lastMove;
  // The end, seen as it happens and with a winner: counts count up; falling leaves when the viewer won or watches.
  const celebrate = useEnded(view.finished) && view.winners.length > 0;
  const leaves = celebrate && (view.spectating || view.results.some((r) => r.winner && r.isMe));

  const send = async (column: number | undefined) => {
    if (column === undefined || pending) return;
    const result = await move({ column });
    if (result?.ok) setChoice(undefined);
  };
  const tap = (column: number) => {
    if (chosen === column) void send(column);
    else setChoice({ turn: view.turn, column });
  };
  const hint = () => {
    if (!view.game) return;
    const best = chooseMove(view.game, { depth: 4 }, view.turn);
    if (best) setChoice({ turn: view.turn, column: best.column });
  };

  // Announce a player leaving the running game (left, kicked or timed out; the reason is not synced).
  // Their name is gone from the state with them, so the last seen seat → name map is kept.
  const seatList = view.seats.map((s) => `${s.seat}:${s.name}`).join(",");
  const [seenSeats, setSeenSeats] = useState({ list: seatList, seats: view.seats, finished: view.finished });
  const [departed, setDeparted] = useState<string>();
  if (seenSeats.list !== seatList || seenSeats.finished !== view.finished) {
    const gone = seenSeats.seats.find((old) => !view.seats.some((s) => s.seat === old.seat));
    if (gone !== undefined && !seenSeats.finished) setDeparted(gone.name);
    setSeenSeats({ list: seatList, seats: view.seats, finished: view.finished });
  }
  useEffect(() => {
    if (departed === undefined) return;
    const timer = setTimeout(() => setDeparted(undefined), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [departed]);

  const message = notice ? t(notice) : departed !== undefined ? t("progress.left", { name: departed }) : undefined;
  const status = !isMyTurn ? t("move.wait") : chosen === undefined ? t("move.choose") : t("move.ready");
  const canMove = isMyTurn && !view.myAutoplay && !view.finished;

  // Settings (and the language) open over the game; the game keeps running underneath.
  if (settingsOpen) return <SettingsScreen roomId={view.roomId} onClose={() => setSettingsOpen(false)} />;

  return (
    <Screen
      start={<GameIdBadge roomId={view.roomId} />}
      end={
        <>
          <SpectatorCount count={view.spectators} />
          {setAutoplay && view.canAutoplay && !view.myAutoplay && <AutoplayButton disabled={pending} onClick={() => void setAutoplay(true)} />}
          <LeaveButton onClick={view.finished || view.spectating ? leave : () => setLeaving(true)} />
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </>
      }
    >
      <div className={styles.layout}>
        <div className={styles.head}>
          <TurnLine view={view} />
          <PlayerStrip view={view} />
        </div>
        <div className={styles.board}>
          <Board board={view.board} line={view.line} chosen={chosen} seat={mySeat} lastMove={shownLastMove} busy={pending} onColumn={canMove ? tap : undefined} />
        </div>
        <div className={styles.side}>
          {view.finished && view.results.length > 0 && <ResultTable rows={view.results} celebrate={celebrate} />}
          {view.finished ? (
            view.spectating ? (
              <GameOverControls
                onHome={leave}
                onNewBotGame={view.botOnly && view.seats.length >= 2 ? () => watchBots(nickname(), view.botSpeed as BotSpeed) : undefined}
              />
            ) : (
              <GameOverControls onHome={leave} onRematch={rematch} rematching={rematching} />
            )
          ) : view.spectating ? (
            <SpectatorPanel botOnly={view.botOnly} speed={view.botSpeed} pending={pending} onSpeed={(speed) => void setSpeed(speed)} />
          ) : leaving ? (
            <LeaveConfirm onLeave={leave} onCancel={() => setLeaving(false)} />
          ) : view.canKick ? (
            <KickControl
              key={view.turn}
              seat={view.turnSeat}
              name={view.seats.find((s) => s.seat === view.turnSeat)?.name ?? ""}
              pending={pending}
              onKick={() => void kick(view.turnSeat)}
            />
          ) : view.myAutoplay ? (
            <AutoplayPanel pending={pending} onTakeBack={() => void setAutoplay?.(false)} />
          ) : (
            <MoveControls
              enabled={canMove}
              pending={pending}
              status={status}
              ready={chosen !== undefined}
              onConfirm={() => void send(chosen)}
              onHint={hint}
              onUndo={view.canUndo ? () => void undo?.() : undefined}
              canUndo={view.undoable}
            />
          )}
        </div>
      </div>
      {leaves && <LeafFall />}
      <Notice message={message} />
      <FirstGameTips playing={!view.spectating && view.phase === "playing" && !view.finished} isMyTurn={view.isMyTurn} />
    </Screen>
  );
}
