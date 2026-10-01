import { Berry } from "./Berry.tsx";

/** A seat's berry at a small fixed size (player strip, turn line, result table); the viewer's own has a ring. */
export function SeatMark({ seat, isMe = false, size = 20 }: { seat: number; isMe?: boolean; size?: number }) {
  return <Berry seat={seat} isMe={isMe} size={size} />;
}
