import { serveBotWorker, type WorkerScopeLike } from "@game-kit/bots/worker";
import type { Move } from "@neljan-suora/rules";
import { answer, type MoveRequest } from "./botMoves.ts";

// The bot's search runs here, off the page's UI thread.
serveBotWorker(self as unknown as WorkerScopeLike<MoveRequest, Move | undefined>, answer);
