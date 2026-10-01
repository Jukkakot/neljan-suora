import { COLUMNS, landingCell } from "@neljan-suora/rules";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Berry } from "./Berry.tsx";
import styles from "./Board.module.css";

export interface BoardProps {
  /** The berry per cell (0 = empty, else the seat), row-major, top row first. */
  board: readonly number[];
  /** Columns of the grid. */
  columns?: number;
  /** The winning line's cells. */
  line?: readonly number[];
  /** The column the viewer chose, previewed with their berry where it would land until they confirm. */
  chosen?: number;
  /** The viewer's seat (the chosen column's berry). */
  seat?: number;
  /** The cells of the last move: marked with a dot and settling in. */
  lastMove?: ReadonlySet<number>;
  /** A command is on its way: taps wait. */
  busy?: boolean;
  /** Tapping a column that is not full; undefined when the viewer cannot move now. */
  onColumn?(column: number): void;
}

/**
 * The upright grid as a birch crate: round moss holes, each a square button. On the viewer's turn a
 * tap anywhere in a column that is not full chooses it (the viewer's berry is previewed, faded, in
 * the cell it would land in) and a second tap in it, or the confirm button below the board, drops
 * it. The last move's berry squishes in and keeps a dot; the winning line's berries shine.
 */
export function Board({ board, columns = COLUMNS, line = [], chosen, seat, lastMove, busy = false, onColumn }: BoardProps) {
  const { t } = useTranslation();
  const rows = Math.ceil(board.length / columns);
  const landing = chosen === undefined ? undefined : landingCell(board, chosen);
  return (
    <div className={styles.board} style={{ "--columns": columns, "--rows": rows } as CSSProperties} role="grid" aria-label={t("board.label")} aria-busy={busy || undefined}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} role="row" className={styles.row}>
          {Array.from({ length: columns }, (_, col) => {
            const cell = row * columns + col;
            const owner = board[cell] ?? 0;
            const full = board[col] !== 0;
            const isChosen = cell === landing;
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
                data-column={col}
                data-owner={owner}
                aria-label={label}
                aria-pressed={isChosen || undefined}
                disabled={full || !onColumn || busy}
                onClick={() => onColumn?.(col)}
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
