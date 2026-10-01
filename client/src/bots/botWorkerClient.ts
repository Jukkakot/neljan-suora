import { botWorkerClient, type WorkerLike } from "@game-kit/bots/worker";
import type { ExplainedMove } from "@neljan-suora/bots";
import { log } from "@game-kit/client";
import { serverUrl } from "../config.ts";
import { answer, type AskBot, type AskExplained, type MoveRequest } from "./botMoves.ts";
import { withBookLookup } from "./bookLookup.ts";
import { recording } from "./explanations.ts";

/**
 * Asks the page's one bot worker for a move and how it was worked out, off the UI thread, after
 * looking the position up in the game server's opening book. Where no worker can run (tests, a failed
 * load, a crash), the move is computed here instead, so games never stall.
 */
export const askExplained: AskExplained = withBookLookup(
  botWorkerClient<MoveRequest, ExplainedMove>({
    create: () =>
      typeof Worker === "undefined"
        ? undefined
        : (new Worker(new URL("./bot.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike<MoveRequest, ExplainedMove>),
    answer,
    onTrouble(trouble, message) {
      if (trouble === "create") log.warn("client.warn", { kind: "bot.worker" }, message);
      else log.error("client.error", { kind: "bot.worker" }, message);
    },
  }),
  {
    async get(path, timeoutMs) {
      const response = await fetch(serverUrl() + path, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onFailure: (message) => log.warn("client.warn", { kind: "bot.book" }, message),
  },
);

/** The bot moves for the session; each answer's explanation goes to the explanation store. */
export const askBotWorker: AskBot = recording(askExplained);
