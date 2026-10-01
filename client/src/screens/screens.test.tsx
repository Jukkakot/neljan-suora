// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
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
  const cell = (container: HTMLElement, i: number) => container.querySelector(`[data-cell='${i}']`) as HTMLButtonElement;

  it("the first tap chooses a cell, the second makes the move", async () => {
    const { container, move } = setup();
    fireEvent.click(cell(container, 4));
    expect(move).not.toHaveBeenCalled();
    expect(cell(container, 4).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Napauta ruutua uudelleen tai paina Aseta")).toBeTruthy();
    await act(async () => fireEvent.click(cell(container, 4)));
    expect(move).toHaveBeenCalledExactlyOnceWith({ cell: 4 });
  });

  it("the confirm button makes the chosen move; it is disabled until a cell is chosen", async () => {
    const { container, move } = setup();
    const confirm = screen.getByRole("button", { name: "Aseta" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(cell(container, 0));
    fireEvent.click(cell(container, 2));
    await act(async () => fireEvent.click(confirm));
    expect(move).toHaveBeenCalledExactlyOnceWith({ cell: 2 });
  });

  it("taken cells and the other's turn cannot be tapped", () => {
    const { container } = setup(gameView({ board: [1, 0, 0, 0, 0, 0, 0, 0, 0], turnSeat: 2, isMyTurn: false }));
    expect(cell(container, 0).disabled).toBe(true);
    expect(cell(container, 1).disabled).toBe(true);
    expect(screen.getByText("Odota vuoroasi")).toBeTruthy();
  });

  it("the hint chooses the winning cell", () => {
    const board = [1, 1, 0, 2, 2, 0, 0, 0, 0];
    const { container } = setup(gameView({ board, game: { seed: 0, seats: [1, 2], left: [], cells: board, turn: 1, moves: 4, over: false, winners: [], line: [] } }));
    fireEvent.click(screen.getByRole("button", { name: "Vihje" }));
    expect(cell(container, 2).getAttribute("aria-pressed")).toBe("true");
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
