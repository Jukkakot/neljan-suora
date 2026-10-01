import { IconCircle, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./Board.module.css";

export interface BoardProps {
  /** The mark per cell (0 = empty, else the seat), row-major, 3×3. */
  board: readonly number[];
  /** The winning line's cells. */
  line?: readonly number[];
  /** The cell the viewer chose, shown with their mark until they confirm. */
  chosen?: number;
  /** The viewer's seat (the chosen cell's mark). */
  seat?: number;
  /** The cells of the last move: marked and settling in. */
  lastMove?: ReadonlySet<number>;
  /** A command is on its way: taps wait. */
  busy?: boolean;
  /** Tapping an empty cell; undefined when the viewer cannot move now. */
  onCell?(cell: number): void;
}

/** A seat's mark: a cross for seat 1, a ring for seat 2, in the seat's colour. */
export function Mark({ seat, size }: { seat: number; size: number }) {
  const Icon = seat === 1 ? IconX : IconCircle;
  return <Icon size={size} stroke={3} aria-hidden="true" style={{ color: `var(--seat-${seat})` }} />;
}

/**
 * The placeholder game's board: 3×3 cells as buttons. On the viewer's turn an empty cell is tappable;
 * the first tap chooses it (shown with the viewer's mark, faded) and a second tap on it, or the
 * confirm button below the board, makes the move. The winning line stands out once the game is won.
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
            const label = owner
              ? t("board.cellTaken", { row: row + 1, col: col + 1, seat: owner })
              : t(isChosen ? "board.cellChosen" : "board.cellEmpty", { row: row + 1, col: col + 1 });
            const cls = [styles.cell, line.includes(cell) && styles.win, isChosen && styles.chosen, lastMove?.has(cell) && styles.last].filter(Boolean).join(" ");
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
                {owner !== 0 && <Mark seat={owner} size={56} />}
                {isChosen && seat !== undefined && (
                  <span className={styles.preview}>
                    <Mark seat={seat} size={56} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
