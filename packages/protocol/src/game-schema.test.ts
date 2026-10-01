import { describe, expect, it } from "vitest";
import { botMovePayloadSchema, movePayloadSchema, optionsPayloadSchema } from "@game-kit/protocol";
import { joinOptionsSchema, moveSchema, optionsSchema } from "./game-schema.js";

describe("moveSchema", () => {
  it("accepts every column", () => {
    for (let column = 0; column < 7; column++) expect(moveSchema.safeParse({ column }).success).toBe(true);
  });

  it("rejects off-grid columns, non-integers, missing and extra fields", () => {
    for (const bad of [{ column: 7 }, { column: -1 }, { column: 1.5 }, { column: "1" }, {}, { cell: 1 }, { column: 1, extra: 1 }, { column: 1, seat: 1 }, null]) {
      expect(moveSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("move and botMove with the game's move", () => {
  it("wrap a move, the bot move with a seat", () => {
    const move = { column: 4 };
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
