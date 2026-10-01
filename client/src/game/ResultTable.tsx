import { IconRobot, IconTrophy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useCountUp } from "../motion/hooks.ts";
import type { ResultRow } from "../session/viewModel.ts";
import styles from "./ResultTable.module.css";
import { SeatMark } from "./SeatMark.tsx";

/**
 * The result of a finished game: both players ranked (the winner first, a draw ranks both first)
 * with their marks on the board; the winner gets a trophy, a player who left says so. With
 * `celebrate` (a game seen ending with a winner) the counts count up and the winner's row shimmers once.
 */
export function ResultTable({ rows, celebrate = false }: { rows: readonly ResultRow[]; celebrate?: boolean }) {
  const { t } = useTranslation();
  return (
    <table className={styles.table} aria-label={t("result.label")}>
      <thead>
        <tr>
          <th scope="col">{t("result.rank")}</th>
          <th scope="col" className={styles.player}>
            {t("result.player")}
          </th>
          <th scope="col">{t("result.marks")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.seat}
            className={row.winner ? [styles.winner, celebrate && styles.shimmer].filter(Boolean).join(" ") : undefined}
            data-seat={row.seat}
            data-rank={row.rank}
          >
            <td className={styles.rank}>{`${row.rank}.`}</td>
            <th scope="row" className={styles.player}>
              <span className={styles.who}>
                <span className={styles.marks}>
                  <SeatMark seat={row.seat} isMe={row.isMe} size={16} />
                </span>
                <span className={row.left ? `${styles.name} ${styles.departed}` : styles.name}>{row.left && !row.name ? t("result.departed") : row.name}</span>
                {row.isBot && <IconRobot size={14} aria-label={t("progress.bot")} />}
                {row.winner && <IconTrophy size={16} className={styles.trophy} aria-label={t("result.winner")} />}
                {row.left && row.name && <span className={styles.departed}>· {t("result.departed")}</span>}
              </span>
            </th>
            <CountCell value={row.marks} run={celebrate} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A count counting up to its final value; the accessible text holds the final value all along. */
function CountCell({ value, run }: { value: number; run: boolean }) {
  const shown = useCountUp(value, run, 900, 0);
  if (shown === value) return <td>{value}</td>;
  return (
    <td>
      <span aria-hidden="true">{shown}</span>
      <span className={styles.srOnly}>{value}</span>
    </td>
  );
}
