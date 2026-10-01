import { IconRobot, IconWifiOff } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { GameView } from "../session/viewModel.ts";
import styles from "./PlayerStrip.module.css";
import { SeatMark } from "./SeatMark.tsx";

/**
 * One chip per seat: the seat's mark, the nickname (shortened with an ellipsis; the full name is in
 * the accessible text) and the seat's marks on the board, and a dimmed chip with an icon when
 * disconnected. The seat on turn has a bar under its chip. A bot's chip has a robot icon, and so does
 * a person's while the bot plays for them.
 */
export function PlayerStrip({ view }: { view: Pick<GameView, "seats"> & Partial<Pick<GameView, "turnSeat" | "finished">> }) {
  const { t } = useTranslation();
  const onTurn = view.finished ? undefined : view.turnSeat || undefined;
  return (
    <ul className={styles.strip} aria-label={t("progress.label")}>
      {view.seats.map((s) => {
        const summary = [
          t(s.isMe ? "progress.seatMe" : "progress.seat", { name: s.name }),
          s.isBot ? t("progress.bot") : undefined,
          s.autoplay ? t(s.isMe ? "progress.autoplayMine" : "progress.autoplay") : undefined,
          t("progress.berries", { count: s.marks }),
          s.connected ? undefined : t("progress.disconnected"),
        ]
          .filter(Boolean)
          .join(", ");
        const turn = s.seat === onTurn;
        const cls = [styles.chip, s.isMe && styles.mine, !s.connected && styles.offline, turn && styles.turn].filter(Boolean).join(" ");
        const style = turn ? ({ "--turn-colour": `var(--seat-${s.seat})` } as CSSProperties) : undefined;
        return (
          <li
            key={s.seat}
            className={cls}
            style={style}
            data-seat={s.seat}
            data-turn={turn ? "" : undefined}
            data-offline={s.connected ? undefined : ""}
            data-autoplay={s.autoplay ? "" : undefined}
          >
            <span className={styles.srOnly}>{summary}</span>
            <span className={styles.marks}>
              <SeatMark seat={s.seat} isMe={s.isMe} />
            </span>
            {(s.isBot || s.autoplay) && <IconRobot size={16} stroke={2} aria-hidden="true" className={styles.botIcon} />}
            <span className={styles.name} aria-hidden="true">
              {s.name}
            </span>
            <span className={styles.count} aria-hidden="true">
              {s.marks}
            </span>
            {!s.connected && <IconWifiOff size={16} stroke={2} aria-hidden="true" className={styles.offlineIcon} />}
          </li>
        );
      })}
    </ul>
  );
}
