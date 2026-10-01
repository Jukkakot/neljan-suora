import styles from "./Controls.module.css";
import { HintButton } from "./HintButton.tsx";
import { UndoButton } from "./UndoButton.tsx";

export interface MoveControlsProps {
  /** The viewer's own turn. */
  enabled: boolean;
  pending: boolean;
  /** What the status line says: the next step. */
  status: string;
  onHint(): void;
  /** A hint is being worked out: "Vihje" waits. */
  hinting?: boolean;
  /** Games against bots on the device only: takes back the last move. */
  onUndo?(): void;
  canUndo?: boolean;
}

/**
 * Under the board during play: the status line (what to do next), "Vihje" and, against bots on the
 * device, "Peru". Shown on every turn, disabled when it is not the viewer's.
 */
export function MoveControls({ enabled, pending, status, onHint, hinting = false, onUndo, canUndo = false }: MoveControlsProps) {
  return (
    <div className={styles.controls}>
      <p className={styles.status} role="status">
        {status}
      </p>
      <div className={styles.bar}>
        {onUndo && <UndoButton disabled={!canUndo || pending} onUndo={onUndo} />}
        <HintButton disabled={!enabled || pending || hinting} onHint={onHint} />
      </div>
    </div>
  );
}
