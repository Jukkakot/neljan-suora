// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "../i18n";
import { seatView } from "../test/views.ts";
import { Berry } from "./Berry.tsx";
import { Board } from "./Board.tsx";
import { TurnLine } from "./TurnLine.tsx";

describe("visual-theme › Seats are berries", () => {
  it("seat 2's berry carries the crown, seat 1's does not", () => {
    const one = render(<Berry seat={1} />).container;
    const two = render(<Berry seat={2} />).container;
    expect(one.querySelector("[data-crown]")).toBeNull();
    expect(two.querySelector("[data-crown]")).not.toBeNull();
  });

  it("The board shows berries: taken cells read puolukka and mustikka", () => {
    const { container } = render(<Board board={[1, 2, 0, 0, 0, 0, 0, 0, 0]} />);
    expect(screen.getByRole("gridcell", { name: "Rivi 1, sarake 1: puolukka" })).toBeTruthy();
    expect(screen.getByRole("gridcell", { name: "Rivi 1, sarake 2: mustikka" })).toBeTruthy();
    expect(container.querySelector("[data-cell='1'] [data-crown]")).not.toBeNull();
  });

  it("the last move keeps its dot", () => {
    const { container } = render(<Board board={[1, 0, 0, 0, 0, 0, 0, 0, 0]} lastMove={new Set([0])} />);
    expect(container.querySelector("[data-cell='0'] [data-last]")).not.toBeNull();
  });
});

describe("visual-theme › Restrained voice", () => {
  it("Another player wins: Kettu voitti – kori täynnä", () => {
    const seats = [seatView(1, "Maija", { isMe: true }), seatView(2, "Kettu")];
    render(<TurnLine view={{ seats, turnSeat: 0, isMyTurn: false, finished: true, winners: [2], mySeat: 1 }} />);
    expect(screen.getByText("Kettu voitti – kori täynnä")).toBeTruthy();
  });
});
