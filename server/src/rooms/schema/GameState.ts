import { schema, t, type SchemaType } from "@colyseus/schema";
import type { LobbyState } from "@game-kit/server";

/** Neljän suora's synced game data: `state.game` in the kit's lobby state. */
export const NeljanSuoraState = schema({
  /** The mark of every cell (0 = empty, else the seat), row-major, 3×3. */
  cells: t.array("uint8"),
  /** The winning line's cells once someone has three in a row; empty otherwise. */
  line: t.array("uint8"),
});
export type NeljanSuoraState = SchemaType<typeof NeljanSuoraState>;

/** The whole synced state of a Neljän suora room. */
export type GameState = LobbyState<NeljanSuoraState>;
