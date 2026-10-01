import { describe, expect, it } from "vitest";
import { startGame } from "@neljan-suora/rules";
import { checkGame, createNeljanSuoraClient } from "./neljanSuoraClient.ts";
import { toGameView, type SyncedState } from "./viewModel.ts";

const players = new Map([
  ["a", { seat: 1, connected: true, name: "Maija" }],
  ["b", { seat: 2, connected: true, name: "Robo", bot: true }],
]);

const state = (cells: number[], extra: Partial<SyncedState> = {}): SyncedState => ({
  players,
  phase: "play",
  turnSeat: 1,
  hostSeat: 1,
  game: { cells, line: [] },
  ...extra,
});

describe("view model", () => {
  it("waits for the board", () => {
    expect(toGameView({ players, phase: "waiting" }, "r", "a")).toBeUndefined();
  });

  it("gives the board, each seat's marks and the running game for the bots", () => {
    const view = toGameView(state([1, 0, 0, 0, 2, 0, 0, 0, 1], { turnSeat: 2 }), "r", "a")!;
    expect(view.board).toEqual([1, 0, 0, 0, 2, 0, 0, 0, 1]);
    expect(view.seats.map((s) => s.marks)).toEqual([2, 1]);
    expect(view.game).toMatchObject({ seats: [1, 2], turn: 2, moves: 3, over: false });
    expect(view.results).toEqual([]);
  });

  it("a won game ranks the winner first, with the line", () => {
    const view = toGameView(state([1, 1, 1, 2, 2, 0, 0, 0, 0], { phase: "finished", turnSeat: 0, winners: [1], game: { cells: [1, 1, 1, 2, 2, 0, 0, 0, 0], line: [0, 1, 2] } }), "r", "b")!;
    expect(view.line).toEqual([0, 1, 2]);
    expect(view.game).toBeUndefined();
    expect(view.results.map((r) => [r.seat, r.rank, r.winner, r.isMe])).toEqual([
      [1, 1, true, false],
      [2, 2, false, true],
    ]);
  });

  it("a draw ranks both first", () => {
    const view = toGameView(state([1, 2, 1, 1, 2, 2, 2, 1, 1], { phase: "finished", turnSeat: 0, winners: [] }), "r", "a")!;
    expect(view.results.map((r) => r.rank)).toEqual([1, 1]);
  });
});

describe("client definition", () => {
  const client = createNeljanSuoraClient(async () => ({ cell: 0 }));

  it("seats the player and a bot, or two bots to watch", () => {
    expect(client.local.seats({ nickname: "Maija", bots: 1, options: {} }).map((s) => [s.seat, s.bot])).toEqual([
      [1, false],
      [2, true],
    ]);
    expect(client.local.seats({ bots: 2, options: {} }).map((s) => [s.seat, s.bot])).toEqual([
      [1, true],
      [2, true],
    ]);
  });

  it("reads a move's cell and refuses a malformed one", () => {
    expect(client.local.parseMove({ cell: 4 })).toEqual({ cell: 4 });
    expect(client.local.parseMove({ cell: "4" })).toBeUndefined();
    expect(client.local.parseMove(undefined)).toBeUndefined();
  });

  it("keeps a saved game of the current rules and drops a broken one", () => {
    const game = startGame(5, [1, 2]);
    expect(checkGame(JSON.parse(JSON.stringify(game)))).toEqual(game);
    expect(() => checkGame({ ...game, cells: [0, 0] })).toThrow();
    expect(() => checkGame({ position: {} })).toThrow();
  });
});
