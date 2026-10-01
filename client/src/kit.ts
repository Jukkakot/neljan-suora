import { configureKit } from "@game-kit/client";
import { CLIENT_KEY_EVENTS } from "@neljan-suora/protocol";
import { serverUrl } from "./config.ts";

// The game's own client log events go next to the kit's (and into CLIENT_LOG_EVENTS in protocol):
// declare module "@game-kit/client" {
//   interface GameClientLogEvents {
//     "client.something.happened": true;
//   }
// }

/** Tells the game kit's client about Neljän suora: storage keys, server, version and key log events. */
export function configureNeljanSuoraKit(): void {
  configureKit({
    storagePrefix: "neljan-suora",
    serverUrl,
    clientVersion: () => import.meta.env.VITE_APP_VERSION || "dev",
    keyEvents: CLIENT_KEY_EVENTS,
  });
}

configureNeljanSuoraKit();
