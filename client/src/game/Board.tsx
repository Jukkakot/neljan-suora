import { useTranslation } from "react-i18next";
import { Berry } from "./Berry.tsx";
import styles from "./Board.module.css";

export interface BoardProps {
  /** The berry per cell (0 = empty, else the seat), row-major, 3×3. */
  board: readonly number[];
  /** The winning line's cells. */
  line?: readonly number[];
  /** The cell the viewer chose, shown with their berry until they confirm. */
  chosen?: number;
  /** The viewer's seat (the chosen cell's berry). */
  seat?: number;
  /** The cells of the last move: marked with a dot and settling in. */
  lastMove?: ReadonlySet<number>;
  /** A command is on its way: taps wait. */
  busy?: boolean;
  /** Tapping an empty cell; undefined when the viewer cannot move now. */
  onCell?(cell: number): void;
}

/**
 * The placeholder game's board as a birch crate: 3×3 round moss holes, each a full square button. On
 * the viewer's turn an empty hole is tappable; the first tap chooses it (shown with the viewer's
 * berry, faded) and a second tap on it, or the confirm button below the board, makes the move. The
 * last move's berry squishes in and keeps a dot; the winning line's berries shine once it is won.
 */
export function Board({ board, line = [], chosen, seat, lastMove, busy = false, onCell }: BoardProps) {
  const { t } = useTranslation();
  const size = Math.sqrt(board.length);
  return (
    <div className={styles.board} role="grid" aria-label={t("board.label")} aria-busy={busy || undefined}>
      {Array.from({ length: size }, (_, row) => (
        <div key={row} role="row" className={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const cell = row * size + col;
            const owner = board[cell] ?? 0;
            const isChosen = chosen === cell && owner === 0;
            const isLast = owner !== 0 && lastMove?.has(cell);
            const label = owner
              ? t("board.cellTaken", { row: row + 1, col: col + 1, berry: t(owner === 1 ? "berry.1" : "berry.2") })
              : t(isChosen ? "board.cellChosen" : "board.cellEmpty", { row: row + 1, col: col + 1 });
            const cls = [styles.cell, line.includes(cell) && styles.win, isChosen && styles.chosen, isLast && styles.last].filter(Boolean).join(" ");
            return (
              <button
                key={cell}
                type="button"
                role="gridcell"
                className={cls}
                data-cell={cell}
                data-owner={owner}
                aria-label={label}
                aria-pressed={isChosen || undefined}
                disabled={owner !== 0 || !onCell || busy}
                onClick={() => onCell?.(cell)}
              >
                <span className={styles.hole}>
                  {owner !== 0 && <Berry seat={owner} size="88%" className={styles.piece} />}
                  {isChosen && seat !== undefined && <Berry seat={seat} size="88%" className={styles.preview} />}
                  {isLast && <span className={styles.dot} data-last="" />}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
