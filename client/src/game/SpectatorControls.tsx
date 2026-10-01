import { IconEye } from "@tabler/icons-react";
import { BOT_SPEEDS, type BotSpeed } from "@neljan-suora/protocol";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button.tsx";
import styles from "./Controls.module.css";
import spectatorStyles from "./SpectatorControls.module.css";

/** Top bar, for everyone: how many spectators watch; nothing without any. */
export function SpectatorCount({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  const label = t("spectate.count", { count });
  return (
    <span className={spectatorStyles.count} role="img" aria-label={label} title={label} data-spectators={count}>
      <IconEye size={20} stroke={2} aria-hidden="true" />
      <span aria-hidden="true">{count}</span>
    </span>
  );
}

export interface SpectatorPanelProps {
  /** Replaces "Katsot peliä" while set: how the last bot move was worked out. */
  status?: string;
  /** Only bots play: the speed can be changed. */
  botOnly: boolean;
  speed: number;
  pending: boolean;
  onSpeed(speed: BotSpeed): void;
}

/** Under the board for a spectator while the game runs: that they are watching, and the bots' speed when only bots play. */
export function SpectatorPanel({ status, botOnly, speed, pending, onSpeed }: SpectatorPanelProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.controls} data-spectator-panel="">
      <div className={styles.actions}>
        <p className={styles.lead} role="status">
          {status ?? t("spectate.watching")}
        </p>
        {botOnly && (
          <div className={spectatorStyles.speeds} role="group" aria-label={t("spectate.speed")}>
            {BOT_SPEEDS.map((s) => (
              <Button
                key={s}
                variant={s === speed ? "primary" : "secondary"}
                aria-pressed={s === speed}
                disabled={pending}
                onClick={() => s !== speed && onSpeed(s)}
              >
                {s}×
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
