/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defaultClientConditions, defaultServerConditions, defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the app under /neljan-suora/; the deploy workflow sets VITE_BASE.
  base: process.env.VITE_BASE ?? "/",
  // Own ports, so this game's dev servers run next to other games' (Vite's default is 5173).
  server: { port: 5193, strictPort: true },
  preview: { port: 5194, strictPort: true },
  plugins: [
    react(),
    // Installable, offline-capable app: the service worker precaches the built shell and swaps in a
    // new version by itself (a reload keeps both kinds of game). Off in `vite dev`.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Neljän suora",
        short_name: "Neljän suora",
        description: "Neljän suora – selainpeli puhelimessa",
        lang: "fi",
        theme_color: "#34407e",
        background_color: "#eef0e8",
        display: "standalone",
        orientation: "portrait",
        // Relative to the manifest, so the same build works under /neljan-suora/ and at the root.
        start_url: ".",
        scope: ".",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        cleanupOutdatedCaches: true,
        // The bot's opening book (Pons' 7x6.book, 33.5 MB) is not precached: it is fetched on the
        // first bot move and then kept, so later visits play from it offline. Its hashed name makes
        // it immutable.
        runtimeCaching: [
          {
            urlPattern: /\/assets\/7x6-[^/]*\.book$/,
            handler: "CacheFirst",
            options: { cacheName: "opening-book", expiration: { maxEntries: 2 } },
          },
        ],
      },
    }),
  ],
  build: {
    // The book always stays its own file.
    assetsInlineLimit: (file) => (file.endsWith(".book") ? false : undefined),
  },
  define: {
    // UTC time of `vite build`, shown on the start screen; null ("dev") for the dev server and tests.
    __BUILD_TIME__: JSON.stringify(command === "build" ? new Date().toISOString() : null),
  },
  resolve: {
    // Resolve the shared workspace packages to their TypeScript source, no build needed.
    conditions: ["source", ...defaultClientConditions],
  },
  // Same for Vitest, which resolves modules like a server.
  ssr: {
    resolve: {
      conditions: ["source", ...defaultServerConditions],
    },
  },
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
}));
