import type { AskBot } from "./botMoves.ts";

/** How long the first question waits for the book before it is asked without it. */
export const FIRST_WAIT_MS = 1500;

export interface BookDeps {
  /** Fetches the book's bytes; rejects or resolves undefined when it cannot. */
  readonly load: () => Promise<ArrayBuffer | undefined>;
  /** Told once when the book could not be fetched. */
  readonly onFailure: (message: string) => void;
  /** Whether to fetch at all (no worker to keep it: tests). */
  readonly enabled: boolean;
  readonly wait?: (ms: number) => Promise<void>;
}

/**
 * Wraps `ask` so the opening book is fetched on the first question of the visit (not at start-up),
 * and handed along with the first question after it arrives. The first question waits for it a
 * little; later ones never wait. A failed fetch is reported once and not retried in this visit.
 */
export function withOpeningBook(ask: AskBot, deps: BookDeps): AskBot {
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let loading: Promise<void> | undefined;
  let book: ArrayBuffer | undefined;
  let handedOver = false;

  return async (request) => {
    if (deps.enabled && !loading) {
      loading = deps.load().then(
        (bytes) => {
          if (bytes) book = bytes;
          else deps.onFailure("no book");
        },
        (error: unknown) => deps.onFailure(error instanceof Error ? error.message : String(error)),
      );
      await Promise.race([loading, wait(FIRST_WAIT_MS)]);
    }
    if (book && !handedOver) {
      handedOver = true;
      return ask({ ...request, book });
    }
    return ask(request);
  };
}
