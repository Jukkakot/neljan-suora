/**
 * Version of the rules package. Server and client both report it so a mismatch between a deployed
 * server and a cached client is easy to spot.
 */
export const RULES_VERSION = "0.1.0";

export * from "./rng.js";
export * from "./turns.js";
export * from "./game.js";
export * from "./contract.js";
