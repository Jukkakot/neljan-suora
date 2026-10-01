import type { StrengthRequirement } from "@game-kit/bots";

/** A requirement of strength.json. */
export interface Requirement extends StrengthRequirement {
  readonly colours: number;
  readonly games: number;
  readonly seed: number;
  /** The candidate must not lose a game it judged a win or a draw at its first move. */
  readonly noLossWhenSettled?: boolean;
}

/** The share check, plus the settled-loss check when the requirement asks for it. */
export function checkWithSettled(
  requirement: Requirement,
  check: { readonly line: string; readonly passed: boolean },
  lostSettled: ReadonlyMap<string, number>,
): { readonly line: string; readonly passed: boolean } {
  if (!requirement.noLossWhenSettled) return check;
  const lost = lostSettled.get(requirement.candidate) ?? 0;
  if (lost === 0) return { ...check, line: `${check.line}; no settled game lost` };
  return { line: `FAIL ${check.line.replace(/^(PASS|FAIL) /, "")}; ${lost} settled game(s) lost`, passed: false };
}
