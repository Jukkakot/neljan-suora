import { describe, expect, it } from "vitest";
import { botMovePayloadSchema, movePayloadSchema, optionsPayloadSchema } from "@game-kit/protocol";
import { joinOptionsSchema, moveSchema, optionsSchema } from "./game-schema.js";

describe("moveSchema", () => {
  it("accepts every board cell", () => {
    for (let cell = 0; cell < 9; cell++) expect(moveSchema.safeParse({ cell }).success).toBe(true);
  });

  it("rejects out-of-range cells, non-integers, missing and extra fields", () => {
    for (const bad of [{ cell: 9 }, { cell: -1 }, { cell: 1.5 }, { cell: "1" }, {}, { cell: 1, extra: 1 }, { cell: 1, seat: 1 }, null]) {
      expect(moveSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("move and botMove with the game's move", () => {
  it("wrap a move, the bot move with a seat", () => {
    const move = { cell: 4 };
    expect(movePayloadSchema(moveSchema).safeParse({ move }).success).toBe(true);
    expect(movePayloadSchema(moveSchema).safeParse(move).success).toBe(false);
    expect(botMovePayloadSchema(moveSchema).safeParse({ seat: 2, move }).success).toBe(true);
    expect(botMovePayloadSchema(moveSchema).safeParse({ seat: 0, move }).success).toBe(false);
  });
});

describe("optionsSchema", () => {
  it("accepts no options and refuses unknown ones", () => {
    expect(optionsPayloadSchema(optionsSchema).safeParse({ options: {} }).success).toBe(true);
    expect(optionsSchema.safeParse({ variant: "duo" }).success).toBe(false);
  });

  it("join options take the options or none", () => {
    expect(joinOptionsSchema.safeParse({ nickname: "Maija" }).success).toBe(true);
    expect(joinOptionsSchema.safeParse({ nickname: "Maija", options: {} }).success).toBe(true);
    expect(joinOptionsSchema.safeParse({ nickname: "Maija", options: { variant: "duo" } }).success).toBe(false);
  });
});
