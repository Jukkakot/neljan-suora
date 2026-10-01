import type { CSSProperties } from "react";
import styles from "./Berry.module.css";

export interface BerryProps {
  seat: number;
  /** Width in px, or a CSS length such as "88%"; the berry is always round. */
  size?: number | string;
  /** The viewer's own seat: a ring in the text colour, so it reads without the name. */
  isMe?: boolean;
  className?: string;
}

/**
 * A seat's piece in the theme "Marjat": a round berry in the seat's colour with a soft highlight.
 * Seat 2 (mustikka) also carries a small crown, so the two seats read apart without colour. The one
 * look for a seat everywhere: board, preview, player strip, turn line and result table. Pure CSS.
 */
export function Berry({ seat, size = "100%", isMe = false, className }: BerryProps) {
  const cls = [styles.berry, isMe && styles.me, className].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ width: size, "--berry": `var(--seat-${seat})` } as CSSProperties} data-seat={seat} aria-hidden="true">
      {seat === 2 && <span className={styles.crown} data-crown="" />}
    </span>
  );
}
