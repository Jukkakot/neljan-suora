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
  /** The column "Vihje" suggests: lit, with the viewer's ghost berry where it would land. */
  hinted?: number;
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
 * height of the grid. On the viewer's turn a tap on a column drops their berry at once; "Vihje" lights
 * the suggested column with their ghost berry where it would land. A new
 * berry drops down its column and squishes, keeping a dot; once won, the winning line shines and the
 * other berries fade.
 */
export function Board({ board, columns = COLUMNS, line = [], hinted, seat, lastMove, busy = false, onColumn }: BoardProps) {
  const { t } = useTranslation();
  const rows = Math.ceil(board.length / columns);
  const landing = hinted === undefined ? undefined : landingCell(board, hinted);
  const won = line.length > 0;
  return (
    <div className={styles.board} style={{ "--columns": columns, "--rows": rows } as CSSProperties} role="group" aria-label={t("board.label")} aria-busy={busy || undefined}>
      {Array.from({ length: columns }, (_, col) => {
        const cells = Array.from({ length: rows }, (_, row) => row * columns + col);
        const full = board[col] !== 0;
        const isHinted = hinted === col && !full;
        const berries = [...cells].reverse().flatMap((cell) => (board[cell] ? [t(board[cell] === 1 ? "berry.1" : "berry.2")] : []));
        const label =
          t("board.column", { col: col + 1, contents: berries.length > 0 ? berries.join(", ") : t("board.empty") }) +
          (full ? t("board.full") : isHinted ? t("board.hinted") : "");
        return (
          <button
            key={col}
            type="button"
            className={isHinted ? `${styles.column} ${styles.hintedColumn}` : styles.column}
            data-column={col}
            aria-label={label}
            disabled={full || !onColumn || busy}
            onClick={() => onColumn?.(col)}
          >
            {cells.map((cell, row) => {
              const owner = board[cell] ?? 0;
              const isGhost = cell === landing;
              const isLast = owner !== 0 && lastMove?.has(cell);
              const inLine = line.includes(cell);
              const cls = [styles.cell, inLine && styles.win, won && !inLine && styles.faded, isGhost && styles.hinted, isLast && styles.last].filter(Boolean).join(" ");
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
