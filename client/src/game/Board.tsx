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
  /** The winning line's cells; the other berries fade once it is set. */
  line?: readonly number[];
  /** The column the viewer chose: lit, with their ghost berry where it would land. */
  chosen?: number;
  /** The viewer's seat (the ghost's berry). */
  seat?: number;
  /** The cells of the last move: they drop in and keep a dot. */
  lastMove?: ReadonlySet<number>;
  /** A command is on its way: taps wait. */
  busy?: boolean;
  /** Tapping a column that is not full; undefined when the viewer cannot move now. */
  onColumn?(column: number): void;
}

/**
 * The upright grid as a birch crate: seven columns of round moss holes, each column one button the
 * height of the grid. On the viewer's turn the first tap on a column lights it and shows their ghost
 * berry where it would land; a second tap, or the confirm button below the board, drops it. A new
 * berry drops down its column and squishes, keeping a dot; once won, the winning line shines and the
 * other berries fade.
 */
export function Board({ board, columns = COLUMNS, line = [], chosen, seat, lastMove, busy = false, onColumn }: BoardProps) {
  const { t } = useTranslation();
  const rows = Math.ceil(board.length / columns);
  const landing = chosen === undefined ? undefined : landingCell(board, chosen);
  const won = line.length > 0;
  return (
    <div className={styles.board} style={{ "--columns": columns, "--rows": rows } as CSSProperties} role="group" aria-label={t("board.label")} aria-busy={busy || undefined}>
      {Array.from({ length: columns }, (_, col) => {
        const cells = Array.from({ length: rows }, (_, row) => row * columns + col);
        const full = board[col] !== 0;
        const isChosen = chosen === col && !full;
        const berries = [...cells].reverse().flatMap((cell) => (board[cell] ? [t(board[cell] === 1 ? "berry.1" : "berry.2")] : []));
        const label =
          t("board.column", { col: col + 1, contents: berries.length > 0 ? berries.join(", ") : t("board.empty") }) +
          (full ? t("board.full") : isChosen ? t("board.chosen") : "");
        return (
          <button
            key={col}
            type="button"
            className={isChosen ? `${styles.column} ${styles.chosenColumn}` : styles.column}
            data-column={col}
            aria-label={label}
            aria-pressed={isChosen || undefined}
            disabled={full || !onColumn || busy}
            onClick={() => onColumn?.(col)}
          >
            {cells.map((cell, row) => {
              const owner = board[cell] ?? 0;
              const isGhost = cell === landing;
              const isLast = owner !== 0 && lastMove?.has(cell);
              const inLine = line.includes(cell);
              const cls = [styles.cell, inLine && styles.win, won && !inLine && styles.faded, isGhost && styles.chosen, isLast && styles.last].filter(Boolean).join(" ");
              return (
                <span key={cell} className={cls} style={isLast ? ({ "--fall": row + 1 } as CSSProperties) : undefined} data-cell={cell} data-owner={owner} aria-hidden="true">
                  <span className={styles.hole}>
                    {owner !== 0 && <Berry seat={owner} size="88%" className={styles.piece} />}
                    {isGhost && seat !== undefined && <Berry seat={seat} size="88%" className={styles.preview} />}
                    {isLast && <span className={styles.dot} data-last="" />}
                  </span>
                </span>
              );
            })}
          </button>
        );
      })}
    </div>
  );
}
