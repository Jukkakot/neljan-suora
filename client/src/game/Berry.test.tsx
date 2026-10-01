// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "../i18n";
import { seatView } from "../test/views.ts";
import { Berry } from "./Berry.tsx";
import { Board } from "./Board.tsx";
import { TurnLine } from "./TurnLine.tsx";

/** A 7 × 6 board from column stacks, bottom up. */
const grid = (stacks: Record<number, number[]>) => {
  const board = Array.from({ length: 42 }, () => 0);
  for (const [column, stack] of Object.entries(stacks)) stack.forEach((seat, height) => (board[(5 - height) * 7 + Number(column)] = seat));
  return board;
};

describe("visual-theme › Seats are berries", () => {
  it("seat 2's berry carries the crown, seat 1's does not", () => {
    const one = render(<Berry seat={1} />).container;
    const two = render(<Berry seat={2} />).container;
    expect(one.querySelector("[data-crown]")).toBeNull();
    expect(two.querySelector("[data-crown]")).not.toBeNull();
  });

  it("The board shows berries: columns read puolukka and mustikka", () => {
    const { container } = render(<Board board={grid({ 0: [1], 1: [2] })} />);
    expect(screen.getByRole("button", { name: "Sarake 1: puolukka" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sarake 2: mustikka" })).toBeTruthy();
    expect(container.querySelector("[data-cell='36'] [data-crown]")).not.toBeNull();
  });

  it("the last move keeps its dot", () => {
    const { container } = render(<Board board={grid({ 0: [1] })} lastMove={new Set([35])} />);
    expect(container.querySelector("[data-cell='35'] [data-last]")).not.toBeNull();
  });
});

describe("game-board › Columns read aloud", () => {
  it("A column with berries: bottom up, then empty, full and hinted", () => {
    render(<Board board={grid({ 2: [1, 2], 0: [1, 2, 1, 2, 1, 2] })} hinted={4} seat={1} onColumn={() => {}} />);
    expect(screen.getByRole("button", { name: "Sarake 3: puolukka, mustikka" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sarake 2: tyhjä" })).toBeTruthy();
    const full = screen.getByRole("button", { name: "Sarake 1: puolukka, mustikka, puolukka, mustikka, puolukka, mustikka, täynnä" }) as HTMLButtonElement;
    expect(full.disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Sarake 5: tyhjä, vihje" })).toBeTruthy();
  });
});

describe("game-board › The winning row stands out", () => {
  it("A win fades the berries outside the line; a draw fades none", () => {
    const board = grid({ 0: [1, 1, 1, 1], 1: [2, 2, 2] });
    const won = render(<Board board={board} line={[14, 21, 28, 35]} />).container;
    expect(won.querySelectorAll("[data-owner='2'][class*='faded']")).toHaveLength(3);
    expect(won.querySelectorAll("[data-owner='1'][class*='faded']")).toHaveLength(0);
    const drawn = render(<Board board={board} />).container;
    expect(drawn.querySelectorAll("[class*='faded']")).toHaveLength(0);
  });
});

describe("visual-theme › Restrained voice", () => {
  it("Another player wins: Kettu voitti – kori täynnä", () => {
    const seats = [seatView(1, "Maija", { isMe: true }), seatView(2, "Kettu")];
    render(<TurnLine view={{ seats, turnSeat: 0, isMyTurn: false, finished: true, winners: [2], mySeat: 1 }} />);
    expect(screen.getByText("Kettu voitti – kori täynnä")).toBeTruthy();
  });
});
