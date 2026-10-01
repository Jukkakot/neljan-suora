// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "../i18n";
import { seatView } from "../test/views.ts";
import { PlayerStrip } from "./PlayerStrip.tsx";

const seats = [seatView(1, "Maija", { marks: 2 }), seatView(2, "Pekka", { marks: 1 })];
const chip = (container: HTMLElement, seat: number) => container.querySelector(`[data-seat='${seat}']`)!;

describe("player strip", () => {
  it("the turn mark goes from seat 1's chip to seat 2's; none once finished", () => {
    const { container, rerender } = render(<PlayerStrip view={{ seats, turnSeat: 1 }} />);
    expect(chip(container, 1).hasAttribute("data-turn")).toBe(true);
    rerender(<PlayerStrip view={{ seats, turnSeat: 2 }} />);
    expect(chip(container, 1).hasAttribute("data-turn")).toBe(false);
    expect(chip(container, 2).hasAttribute("data-turn")).toBe(true);
    rerender(<PlayerStrip view={{ seats, turnSeat: 2, finished: true }} />);
    expect(container.querySelector("[data-turn]")).toBeNull();
  });

  it("each chip tells the seat's marks", () => {
    const { container } = render(<PlayerStrip view={{ seats, turnSeat: 1 }} />);
    expect(chip(container, 1).textContent).toContain("2 marjaa");
    expect(chip(container, 2).textContent).toContain("1 marja");
  });
});
