import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { boot, type ColyseusTestServer } from "@colyseus/testing";
import { BOARD_CELLS, BOARD_COLUMNS } from "@neljan-suora/protocol";
import { CELLS, COLUMNS } from "@neljan-suora/rules";
import appConfig from "../src/app.config.js";
import type { GameState } from "../src/rooms/schema/GameState.js";
import { gameOf, startedGame, waitingRoom } from "./support/game.js";

describe("GameRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => {
    await colyseus.shutdown();
  });
  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it("protocol and rules agree on the grid", () => {
    expect([BOARD_CELLS, BOARD_COLUMNS]).toEqual([CELLS, COLUMNS]);
  });

  it("adds a connected player on join and removes them on leave", async () => {
    // The guest leaves: the host keeps the room open.
    const { room, clients } = await waitingRoom(colyseus, 2);
    const client = clients[1]!;

    expect(room.state.players.get(client.sessionId)?.connected).toBe(true);
    expect([...(room.state as GameState).game.cells]).toEqual(Array.from({ length: CELLS }, () => 0));

    await client.leave();
    await vi.waitFor(() => expect(room.state.players.has(client.sessionId)).toBe(false));
  });

  it("plays a game to the end, syncing the board and the winning line", async () => {
    const { room, clients } = await startedGame(colyseus);
    const state = room.state as GameState;
    // Seat 1 stacks four in column 0; seat 2 stacks three in column 1.
    for (const [i, column] of [[0, 0], [1, 1], [0, 0], [1, 1], [0, 0], [1, 1], [0, 0]] as const) {
      expect(await clients[i]!.request("move", { move: { column } })).toEqual({ ok: true });
    }
    expect([...state.game.cells].filter((c) => c !== 0)).toHaveLength(7);
    expect([...state.game.line]).toEqual([14, 21, 28, 35]);
    expect(state.phase).toBe("finished");
    expect([...state.winners]).toEqual([1]);
  });

  it("refuses a full column and leaves the game as it was", async () => {
    const { room, clients } = await startedGame(colyseus);
    for (let i = 0; i < 6; i++) await clients[i % 2]!.request("move", { move: { column: 3 } });
    const before = gameOf(room);
    expect(await clients[0]!.request("move", { move: { column: 3 } })).toEqual({ ok: false, code: "COLUMN_FULL" });
    expect(await clients[0]!.request("move", { move: { column: 7 } })).toMatchObject({ ok: false, code: "INVALID_COMMAND" });
    expect(gameOf(room)).toBe(before);
  });

  it("mounts the kit's watch route", async () => {
    const res = await colyseus.http.post("/watch", { body: "{}", headers: { "Content-Type": "text/plain" } }).catch((err: { statusCode?: number }) => err);
    expect((res as { statusCode?: number }).statusCode).toBe(400);
  });

  it("serves a health check reporting the rules version and build", async () => {
    const res = await colyseus.http.get("/health");
    // Tests run from source, without a build: no build time.
    expect(res.data).toEqual({ status: "ok", rulesVersion: expect.any(String), version: "dev", builtAt: null });
  });
});
