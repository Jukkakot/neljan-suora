import { listen } from "@colyseus/tools";
import app from "./app.config.js";
import { installProcessHandlers, log, setLogGame } from "@game-kit/server";

// Every log line names the game: the games share one Axiom dataset.
setLogGame("neljan-suora");
installProcessHandlers();

// Listens on PORT (Render sets it) or 2587 by default (not Colyseus' 2567, so it runs next to other games).
const port = Number(process.env.PORT ?? 2587);
const server = await listen(app, port);
log.info("server.started", { port });

server.onBeforeShutdown(() => {
  log.info("server.shutdown");
});
