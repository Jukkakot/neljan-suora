import { defineServer, defineRoom, LobbyRoom, monitor, playground } from "colyseus";
import { RULES_VERSION } from "@neljan-suora/rules";
import { clientLogBatchSchema } from "@neljan-suora/protocol";
import { loadBook, mountBook } from "./book.js";
import { readBuiltAt } from "./buildInfo.js";
import { configureCors } from "./cors.js";
import { attachHttpAudit, frameworkLogger, mountClientLogs, mountWatch, serverVersion } from "@game-kit/server";
import { GameRoom } from "./rooms/GameRoom.js";

const isProduction = process.env.NODE_ENV === "production";
/** Read once: which build is running (shown on the start screen, doubles as the wake-up request). */
const builtAt = readBuiltAt();

const server = defineServer({
  logger: frameworkLogger,

  rooms: {
    // The start screen's list of open games: the built-in lobby pushes listing changes.
    lobby: defineRoom(LobbyRoom),
    // `pool` partitions quick play (E2E isolation, manual testing groups).
    game: defineRoom(GameRoom).filterBy(["pool"]).enableRealtimeListing(),
  },

  express: (app) => {
    // The transport exists by now: audit every HTTP request on the Node server,
    // matchmaking included (it bypasses Express).
    attachHttpAudit(server.transport?.server);
    configureCors();
    // Render sits behind one proxy; needed for per-client rate limits.
    app.set("trust proxy", 1);
    mountClientLogs(app, clientLogBatchSchema);
    mountWatch(app);
    // Read once at start: the bot opening book, looked up by the browsers.
    mountBook(app, loadBook());

    app.get("/health", (_req, res) => {
      res.json({ status: "ok", rulesVersion: RULES_VERSION, version: serverVersion(), builtAt });
    });

    // Development-only debugging tools: room inspector and test client.
    if (!isProduction) {
      app.use("/monitor", monitor());
      app.use("/playground", playground());
    }
  },
});

export default server;
