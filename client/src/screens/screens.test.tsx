// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../i18n";
import type { ServerWake } from "@game-kit/client";
import type { GameSession } from "../session/useGameSession.ts";
import { reloadSettings } from "../settings/settings.ts";
import { gameView } from "../test/views.ts";
import { GameScreen, type GameScreenProps } from "./GameScreen.tsx";
import { StartScreen, type StartScreenProps } from "./StartScreen.tsx";

const ready: ServerWake = { state: "ready", slow: false, server: { builtAt: null } };

/** A start-screen session: idle unless overridden, every action a spy. */
function sessionOf(overrides: Partial<StartScreenProps["session"]> = {}): StartScreenProps["session"] {
  return {
    status: "idle",
    slow: false,
    createGame: vi.fn(),
    joinById: vi.fn(),
    playBots: vi.fn(),
    joinInvite: vi.fn(),
    watch: vi.fn(),
    watchBots: vi.fn(),
    retry: vi.fn(),
    resume: vi.fn(),
    ...overrides,
  };
}

// A returning player: the remembered nickname makes the join actions available.
beforeEach(() => localStorage.setItem("neljan-suora.nickname", "Maija"));
afterEach(() => {
  localStorage.clear();
  reloadSettings();
});

describe("start screen", () => {
  it("two ways in: a game against a bot at once, and a game for friends", () => {
    const session = sessionOf();
    render(<StartScreen session={session} wake={ready} />);
    fireEvent.click(screen.getByRole("button", { name: "Pelaa bottia vastaan" }));
    expect(session.playBots).toHaveBeenCalledExactlyOnceWith("Maija");
    fireEvent.click(screen.getByRole("button", { name: "Luo peli" }));
    expect(session.createGame).toHaveBeenCalledExactlyOnceWith("Maija");
  });

  it("Pelaan itse off offers a game of bots to watch", () => {
    const session = sessionOf();
    render(<StartScreen session={session} wake={ready} />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Katso bottien peliä" }));
    expect(session.watchBots).toHaveBeenCalledExactlyOnceWith("Maija");
  });

  it("a sleeping server disables creating a game but not the bot game", () => {
    render(<StartScreen session={sessionOf()} wake={{ state: "waking", slow: false }} />);
    expect((screen.getByRole("button", { name: "Luo peli" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Pelaa bottia vastaan" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("lists an open game and joins it", () => {
    const session = sessionOf();
    const openGames = { status: "ready" as const, games: [{ roomId: "brave-otters-sing", host: "Pekka", seated: 1, maxSeats: 2, options: {} }], running: [] };
    render(<StartScreen session={session} wake={ready} openGames={openGames} />);
    fireEvent.click(screen.getByRole("button", { name: "Liity peliin: Pekka, 1/2 pelaajaa" }));
    expect(session.joinById).toHaveBeenCalledExactlyOnceWith("brave-otters-sing", "Maija");
  });
});

describe("game screen › a move", () => {
  function setup(view = gameView()) {
    const move = vi.fn<GameSession["move"]>(async () => ({ ok: true }));
    const session: GameScreenProps["session"] = {
      move,
      kick: vi.fn(),
      leave: vi.fn(),
      pending: false,
      setSpeed: vi.fn(),
      rematch: vi.fn(),
      rematching: false,
      watchBots: vi.fn(),
      nickname: () => "Maija",
    };
    return { move, ...render(<GameScreen view={view} session={session} />) };
  }
  const column = (container: HTMLElement, c: number) => container.querySelector(`[data-column='${c}']`) as HTMLButtonElement;
  const ghostAt = (container: HTMLElement, cell: number) => container.querySelector(`[data-cell='${cell}'] [class*='preview']`);

  /** A grid from column stacks (bottom up): `{ 0: [1, 2] }` puts seat 1 at the bottom of column 0 and seat 2 above it. */
  const gridOf = (stacks: Record<number, number[]>) => {
    const board = Array.from({ length: 42 }, () => 0);
    for (const [c, stack] of Object.entries(stacks)) stack.forEach((seat, height) => (board[(5 - height) * 7 + Number(c)] = seat));
    return board;
  };

  it("Choosing a column shows the ghost where it lands; Confirming sends the column", async () => {
    const { container, move } = setup(gameView({ board: gridOf({ 3: [2, 1] }) }));
    fireEvent.click(column(container, 3));
    expect(move).not.toHaveBeenCalled();
    expect(column(container, 3).getAttribute("aria-pressed")).toBe("true");
    // Two berries in column 3 (index 3): the ghost is in the third hole from the bottom.
    expect(ghostAt(container, 24)).not.toBeNull();
    expect(screen.getByText("Napauta saraketta uudelleen tai paina Aseta")).toBeTruthy();
    await act(async () => fireEvent.click(column(container, 3)));
    expect(move).toHaveBeenCalledExactlyOnceWith({ column: 3 });
  });

  it("Changing the choice moves the ghost; the confirm button makes the chosen move", async () => {
    const { container, move } = setup();
    const confirm = screen.getByRole("button", { name: "Aseta" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(column(container, 4));
    fireEvent.click(column(container, 2));
    expect(move).not.toHaveBeenCalled();
    expect([ghostAt(container, 39), ghostAt(container, 37)].map((g) => g !== null)).toEqual([false, true]);
    await act(async () => fireEvent.click(confirm));
    expect(move).toHaveBeenCalledExactlyOnceWith({ column: 2 });
  });

  it("A full column and the other's turn cannot be tapped", () => {
    const board = gridOf({ 0: [1, 2, 1, 2, 1, 2] });
    const mine = setup(gameView({ board })).container;
    expect([column(mine, 0).disabled, column(mine, 1).disabled]).toEqual([true, false]);
    cleanup();
    const { container } = setup(gameView({ board, turnSeat: 2, isMyTurn: false }));
    expect(column(container, 1).disabled).toBe(true);
    expect(screen.getByText("Odota vuoroasi")).toBeTruthy();
  });

  it("the hint chooses the winning column", () => {
    const board = gridOf({ 0: [1, 1, 1], 1: [2, 2, 2] });
    const { container } = setup(gameView({ board, game: { seed: 0, seats: [1, 2], left: [], cells: board, turn: 1, moves: 6, over: false, winners: [], line: [] } }));
    fireEvent.click(screen.getByRole("button", { name: "Vihje" }));
    expect(column(container, 0).getAttribute("aria-pressed")).toBe("true");
  });

  it("a finished game shows the result and Pelaa uudelleen", () => {
    setup(gameView({ finished: true, phase: "finished", winners: [1], turnSeat: 0, isMyTurn: false, game: undefined, results: [
      { seat: 1, name: "Maija", isMe: true, isBot: false, marks: 3, left: false, winner: true, rank: 1 },
      { seat: 2, name: "Pekka", isMe: false, isBot: false, marks: 2, left: false, winner: false, rank: 2 },
    ] }));
    expect(screen.getByText("Voitit – kori täynnä!")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Tulokset" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pelaa uudelleen" })).toBeTruthy();
  });
});

describe("visual-theme › Motion of a won game", () => {
  const results = (winner: boolean) => [
    { seat: 1, name: "Maija", isMe: true, isBot: false, marks: 3, left: false, winner, rank: 1 },
    { seat: 2, name: "Pekka", isMe: false, isBot: false, marks: 3, left: false, winner: false, rank: winner ? 2 : 1 },
  ];
  /** A game seen running, then seen to end as `end` says. */
  function end(end: Parameters<typeof gameView>[0]) {
    const session = { move: vi.fn(), kick: vi.fn(), leave: vi.fn(), pending: false, setSpeed: vi.fn(), rematch: vi.fn(), rematching: false, watchBots: vi.fn(), nickname: () => "Maija" };
    const { container, rerender } = render(<GameScreen view={gameView()} session={session} />);
    rerender(<GameScreen view={gameView({ finished: true, phase: "finished", turnSeat: 0, isMyTurn: false, game: undefined, ...end })} session={session} />);
    return container.ownerDocument;
  }

  it("A win: leaves fall", () => {
    const doc = end({ winners: [1], results: results(true) });
    expect(doc.querySelector("[data-leaffall]")).not.toBeNull();
  });

  it("A draw: no leaves fall", () => {
    const doc = end({ winners: [], results: results(false) });
    expect(doc.querySelector("[data-leaffall]")).toBeNull();
  });
});
