import type { ColyseusTestServer } from "@colyseus/testing";
import { expect } from "vitest";
import type { CommandResult } from "@neljan-suora/protocol";
import type { Game } from "@neljan-suora/rules";
import type appConfig from "../../src/app.config.js";
import type { GameRoom } from "../../src/rooms/GameRoom.js";

/** The parts of an SDK room the room tests use. */
export interface TestClient {
  sessionId: string;
  roomId: string;
  state: unknown;
  request(type: string, payload: unknown): Promise<unknown>;
  leave(consented?: boolean): Promise<unknown>;
  onLeave(cb: (code: number) => void): unknown;
  connection: { close(code?: number): void };
  reconnection: { minUptime: number };
}

type Server = ColyseusTestServer<typeof appConfig>;

export const NAMES = ["Maija", "Pekka"] as const;

export interface GameOptions {
  /** Extra join options for the room creation (pool, private). */
  create?: Record<string, unknown>;
}

/** A new game's waiting room with `players` seated (seats 1…n, seat 1 hosting), named after `NAMES`. */
export async function waitingRoom(colyseus: Server, players: number, options: GameOptions = {}) {
  const room = (await colyseus.createRoom("game", { nickname: NAMES[0], ...options.create })) as unknown as GameRoom;
  // The test clients never compute bot moves: the server's fallback plays bot turns right after the pause.
  room.botRunnerGraceMs = 0;
  const clients: TestClient[] = [];
  for (let i = 0; i < players; i++) clients.push(await join(colyseus, room, NAMES[i]!));
  return { room, clients };
}

/** Seats one more player in `room` under `nickname`. */
export async function join(colyseus: Server, room: GameRoom, nickname: string): Promise<TestClient> {
  return (await colyseus.connectTo(room as never, { nickname })) as unknown as TestClient;
}

/** The running game as the room's rules hold it (undefined in the waiting room). */
export function gameOf(room: GameRoom): Game {
  return (room as unknown as { current: Game }).current;
}

/** A started game of two players where `startSeat` (default seat 1, the host) has the first turn. */
export async function startedGame(colyseus: Server, startSeat = 1) {
  const game = await waitingRoom(colyseus, 2);
  game.room.adjustStart = (g) => ({ ...g, turn: startSeat });
  expect(await game.clients[0]!.request("start", {})).toEqual({ ok: true } satisfies CommandResult);
  return game;
}
