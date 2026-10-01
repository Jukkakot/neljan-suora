import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button.tsx";
import styles from "./Controls.module.css";
import { HintButton } from "./HintButton.tsx";
import { UndoButton } from "./UndoButton.tsx";

export interface MoveControlsProps {
  /** The viewer's own turn. */
  enabled: boolean;
  pending: boolean;
  /** What the status line says: the next step. */
  status: string;
  /** A cell is chosen: the confirm button works. */
  ready: boolean;
  onConfirm(): void;
  onHint(): void;
  /** Games against bots on the device only: takes back the last move. */
  onUndo?(): void;
  canUndo?: boolean;
}

/**
 * Under the board during play: the status line (what to do next), the confirm button, "Vihje" and,
 * against bots on the device, "Peru". Shown on every turn, disabled when it is not the viewer's.
 */
export function MoveControls({ enabled, pending, status, ready, onConfirm, onHint, onUndo, canUndo = false }: MoveControlsProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.controls}>
      <p className={styles.status} role="status">
        {status}
      </p>
      <div className={styles.bar}>
        <Button className={styles.place} disabled={!enabled || !ready || pending} onClick={onConfirm}>
          {t("move.confirm")}
        </Button>
        {onUndo && <UndoButton disabled={!canUndo || pending} onUndo={onUndo} />}
        <HintButton disabled={!enabled || pending} onHint={onHint} />
      </div>
    </div>
  );
}
