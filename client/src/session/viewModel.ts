import { toLobbyView, type GamePhase, type LobbySeat, type LobbyView, type SyncedLobbyState, type SyncedPlayer } from "@game-kit/client";
import { CELLS, type Game } from "@neljan-suora/rules";

export type { GamePhase, SyncedPlayer };

/** Neljän suora's synced game data (`state.game`) as the client receives it. */
export interface SyncedGame {
  /** The mark of every cell (0 = empty, else the seat), row-major. */
  cells?: Iterable<number>;
  /** The winning line's cells once someone has three in a row. */
  line?: Iterable<number>;
}

/** The synced state as the client receives it (Colyseus schema instances satisfy this shape). */
export type SyncedState = SyncedLobbyState & { game?: SyncedGame };

export interface SeatView extends LobbySeat {
  /** The seat's marks on the board. */
  marks: number;
}

/** One player's line in the result of a finished game. */
export interface ResultRow {
  seat: number;
  /** The player's nickname; empty for a player who left (the name left with them). */
  name: string;
  isMe: boolean;
  isBot: boolean;
  marks: number;
  /** The player left the game before the end. */
  left: boolean;
  winner: boolean;
  /** 1 for the winner (both on a draw), 2 for the other. */
  rank: number;
}

/** What Neljän suora shows on top of the kit's lobby view: the board and the result. */
export interface NeljanSuoraView {
  /** The mark per cell (0 = empty, else the seat), row-major. */
  board: readonly number[];
  /** The winning line's cells; empty until someone wins. */
  line: readonly number[];
  /** The running game as the rules see it (for bot moves); undefined in the waiting room and once finished. */
  game?: Game;
  /** Once finished: both players, the winner first. Empty before the end. */
  results: ResultRow[];
}

/** Neljän suora's view: the kit's lobby view (with the game's seats) and what the game adds. */
export type GameView = LobbyView<SeatView> & NeljanSuoraView;

/**
 * Neljän suora's view from the synced state and the kit's lobby view. Undefined until the board has
 * arrived (right after joining, the state is still empty until the first patch).
 */
export function toView(state: SyncedState, lobby: LobbyView): GameView | undefined {
  const board = state.game?.cells ? [...state.game.cells] : [];
  if (board.length !== CELLS) return undefined;
  const line = state.game?.line ? [...state.game.line] : [];
  const marksOf = (seat: number) => board.filter((c) => c === seat).length;
  const seats: SeatView[] = lobby.seats.map((s) => ({ ...s, marks: marksOf(s.seat) }));
  const { finished, turnSeat, phase } = lobby;
  const running = phase === "playing" && !finished && turnSeat !== 0;
  const moves = board.filter((c) => c !== 0).length;
  const game: Game | undefined = running
    ? { seed: 0, seats: seats.map((s) => s.seat), left: [], cells: board, turn: turnSeat, moves, over: false, winners: [], line: [] }
    : undefined;
  return { ...lobby, seats, board, line, game, results: finished ? resultRows(board, seats, lobby.winners) : [] };
}

/** The whole view of a game from synced state: the kit's lobby view and the game's `toView`. */
export function toGameView(state: SyncedState, roomId: string, mySessionId: string): GameView | undefined {
  return toView(state, toLobbyView(state, roomId, mySessionId));
}

/** The result table: both seats of the board, the winner first; a seat that left has no name. */
export function resultRows(board: readonly number[], seats: readonly SeatView[], winners: readonly number[]): ResultRow[] {
  const seatNumbers = [...new Set([...seats.map((s) => s.seat), ...board.filter((c) => c !== 0)])].sort((a, b) => a - b);
  const rows = seatNumbers.map((seatNumber): ResultRow => {
    const seat = seats.find((s) => s.seat === seatNumber);
    const winner = winners.includes(seatNumber);
    return {
      seat: seatNumber,
      name: seat?.name ?? "",
      isMe: seat?.isMe ?? false,
      isBot: seat?.isBot ?? false,
      marks: board.filter((c) => c === seatNumber).length,
      left: seat === undefined,
      winner,
      rank: winner || winners.length === 0 ? 1 : 2,
    };
  });
  return rows.sort((a, b) => a.rank - b.rank || a.seat - b.seat);
}
