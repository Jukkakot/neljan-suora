// @vitest-environment jsdom
import { firstTurn, startGame } from "@neljan-suora/rules";
import { afterEach, describe, expect, it } from "vitest";
import { firstPlayerOptions, loadFirstPlayer, rematchOptions, saveFirstPlayer } from "./firstPlayer.ts";

afterEach(() => localStorage.clear());

describe("start-screen › Who starts against the bot", () => {
  it("First visit: Arvonta", () => {
    expect(loadFirstPlayer()).toBe("random");
  });

  it("Remembered: the choice round-trips", () => {
    saveFirstPlayer("me");
    expect(loadFirstPlayer()).toBe("me");
    saveFirstPlayer("bot");
    expect(loadFirstPlayer()).toBe("bot");
  });

  it("garbage in storage gives Arvonta", () => {
    localStorage.setItem("neljan-suora.firstPlayer", "{nope");
    expect(loadFirstPlayer()).toBe("random");
  });

  it("the choice maps to the game's first seat", () => {
    expect(firstPlayerOptions("me")).toEqual({ firstSeat: 1 });
    expect(firstPlayerOptions("bot")).toEqual({ firstSeat: 2 });
    expect(firstPlayerOptions("random")).toEqual({});
  });
});

describe("device-games › The rematch alternates the starter", () => {
  it("After the person started: the bot starts the next game", () => {
    expect(rematchOptions(startGame(5, [1, 2], 1), { firstSeat: 1 })).toEqual({ firstSeat: 2 });
    expect(rematchOptions(startGame(5, [1, 2], 2), { firstSeat: 2 })).toEqual({ firstSeat: 1 });
  });

  it("After a drawn starter: the bot drew the start, so the person starts next", () => {
    const seed = Array.from({ length: 50 }, (_, s) => s).find((s) => firstTurn(s, [1, 2]) === 2)!;
    expect(rematchOptions(startGame(seed, [1, 2]), {})).toEqual({ firstSeat: 1 });
  });
});
