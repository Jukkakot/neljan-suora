import { z } from "zod";
import { joinOptionsSchema as kitJoinOptionsSchema } from "@game-kit/protocol";
import { BOARD_CELLS, type MovePayload, type NeljanSuoraOptions } from "./game-codes.js";

// The kit's generic payload schemas, next to the game's own.
export {
  autoplayPayloadSchema,
  botSeatPayloadSchema,
  kickPayloadSchema,
  nicknameSchema,
  rematchPayloadSchema,
  speedPayloadSchema,
  startPayloadSchema,
  watchRequestSchema,
} from "@game-kit/protocol";

/** Neljän suora's move (in `move` and `botMove`): a board cell. */
export const moveSchema = z.strictObject({
  cell: z.int().min(0).max(BOARD_CELLS - 1),
}) satisfies z.ZodType<MovePayload>;

/** Neljän suora's options (in the join options, the listing and `setOptions`): none yet. */
export const optionsSchema = z.strictObject({}) as unknown as z.ZodType<NeljanSuoraOptions>;

/**
 * Join options with the game's options. Unknown keys are refused, so an old app asking for
 * something this server does not know gets no game.
 */
export const joinOptionsSchema = kitJoinOptionsSchema(optionsSchema);
