import { schema, t, type SchemaType } from "@colyseus/schema";
import type { LobbyState } from "@game-kit/server";

/** Neljän suora's synced game data: `state.game` in the kit's lobby state. */
export const NeljanSuoraState = schema({
  /** The disc in every cell (0 = empty, else the seat), row-major, top row first, 7 × 6. */
  cells: t.array("uint8"),
  /** The cells of the winning lines of four once someone has won; empty otherwise. */
  line: t.array("uint8"),
});
export type NeljanSuoraState = SchemaType<typeof NeljanSuoraState>;

/** The whole synced state of a Neljän suora room. */
export type GameState = LobbyState<NeljanSuoraState>;
