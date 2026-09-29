import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Lets a second checkout (or E2E run) use other ports; defaults are unchanged.
function portFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`${name} must be a port number from 1 to 65535`);
  return port;
}
const webPort = portFromEnv("SOLLU_WEB_PORT", 5173);
const apiHost = `127.0.0.1:${portFromEnv("SOLLU_API_PORT", 8787)}`;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Sollu",
        short_name: "Sollu",
        description: "Say it. In your words. In your voice.",
        theme_color: "#231040",
        background_color: "#f9f7fc",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 4000000,
        navigateFallbackDenylist: [/^\/api/, /^\/ws/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(bin|json)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "sollu-models",
              expiration: { maxEntries: 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": `http://${apiHost}`,
      "/ws": { target: `ws://${apiHost}`, ws: true },
    },
  },
  build: { chunkSizeWarningLimit: 700 },
});
