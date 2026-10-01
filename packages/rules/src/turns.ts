// The turn rules every kit game shares (the clock, the seat hold, kicking); Neljän suora adds its seat count.
export {
  DISCONNECT_LIMIT_SECONDS,
  kickRejection,
  MIN_SEATS,
  TURN_TIME_LIMIT_SECONDS,
  type KickCheck,
  type KickRejection,
} from "@game-kit/protocol";

/** The most seats a game takes. */
export const SEAT_COUNT = 2;
