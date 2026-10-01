import { botWorkerClient, type WorkerLike } from "@game-kit/bots/worker";
import type { Move } from "@neljan-suora/rules";
import { log } from "@game-kit/client";
import bookUrl from "@neljan-suora/bots/book?url";
import { answer, type AskBot, type MoveRequest } from "./botMoves.ts";
import { withOpeningBook } from "./openingBook.ts";

/**
 * Asks the page's one bot worker for a move, off the UI thread. Where no worker can run (tests, a
 * failed load, a crash), the move is computed here instead, so games never stall. The opening book is
 * fetched on the first question and handed to the worker.
 */
export const askBotWorker: AskBot = withOpeningBook(
  botWorkerClient<MoveRequest, Move | undefined>({
    create: () =>
      typeof Worker === "undefined"
        ? undefined
        : (new Worker(new URL("./bot.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike<MoveRequest, Move | undefined>),
    answer,
    onTrouble(trouble, message) {
      if (trouble === "create") log.warn("client.warn", { kind: "bot.worker" }, message);
      else log.error("client.error", { kind: "bot.worker" }, message);
    },
  }),
  {
    enabled: typeof Worker !== "undefined",
    load: async () => {
      const response = await fetch(bookUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    },
    onFailure: (message) => log.warn("client.warn", { kind: "bot.book" }, message),
  },
);
