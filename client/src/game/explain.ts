import type { TFunction } from "i18next";
import type { MoveHow } from "@neljan-suora/bots";
import type { Explanation } from "../bots/explanations.ts";

interface Named {
  readonly seat: number;
  readonly name: string;
}

/** The status line after a bot's move worked out here: "Kettu: kirjasta · Kettu voittaa". */
export function explanationText(t: TFunction, { seat, how }: Explanation, seats: readonly Named[]): string {
  const name = seats.find((s) => s.seat === seat)?.name ?? "";
  const other = seats.find((s) => s.seat !== seat)?.name ?? "";
  const outcome =
    how.outcome === undefined ? "" : how.outcome === 0 ? t("explain.draw") : t("explain.wins", { name: how.outcome > 0 ? name : other });
  return t("explain.line", { name, how: t(`explain.how.${how.source}`), outcome });
}

/** A shown hint and how it was worked out, the outcome for the person asking. */
export function hintText(t: TFunction, column: number, how: MoveHow | undefined): string {
  if (!how) return t("move.hinted", { column: column + 1 });
  const outcome = how.outcome === undefined ? "" : t(`explain.hintOutcome.${how.outcome > 0 ? "win" : how.outcome < 0 ? "loss" : "draw"}`);
  return t("move.hintedHow", { column: column + 1, how: t(`explain.hintHow.${how.source}`), outcome });
}
