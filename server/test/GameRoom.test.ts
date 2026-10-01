import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { boot, type ColyseusTestServer } from "@colyseus/testing";
import { BOARD_CELLS } from "@neljan-suora/protocol";
import { CELLS } from "@neljan-suora/rules";
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

  it("protocol and rules agree on the board", () => {
    expect(BOARD_CELLS).toBe(CELLS);
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
    // Seat 1 takes the top row; seat 2 the middle row's first two cells.
    for (const [i, cell] of [[0, 0], [1, 3], [0, 1], [1, 4], [0, 2]] as const) {
      expect(await clients[i]!.request("move", { move: { cell } })).toEqual({ ok: true });
    }
    expect([...state.game.cells]).toEqual([1, 1, 1, 2, 2, 0, 0, 0, 0]);
    expect([...state.game.line]).toEqual([0, 1, 2]);
    expect(state.phase).toBe("finished");
    expect([...state.winners]).toEqual([1]);
  });

  it("refuses a taken cell and leaves the game as it was", async () => {
    const { room, clients } = await startedGame(colyseus);
    await clients[0]!.request("move", { move: { cell: 4 } });
    const before = gameOf(room);
    expect(await clients[1]!.request("move", { move: { cell: 4 } })).toEqual({ ok: false, code: "CELL_TAKEN" });
    expect(await clients[1]!.request("move", { move: { cell: 9 } })).toMatchObject({ ok: false, code: "INVALID_COMMAND" });
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
