import { brandMark, themes } from "@platitprosim/ui/tokens";
import { platitprosimUi } from "@platitprosim/ui/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    platitprosimUi(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Icons, favicon and apple-touch-icon are generated from public/logo.webp (pwa-assets.config.ts).
      pwaAssets: { config: true, injectThemeColor: false },
      // sqlite3.wasm is precached too, so Evolu opens its database offline.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,ico,woff2,wasm}"],
      },
      manifest: {
        name: "fazole.fit",
        short_name: "fazole.fit",
        description: "Platební terminál pro české obchodníky",
        lang: "cs",
        id: "/",
        scope: "/",
        start_url: "/",
        display: "standalone",
        background_color: themes.dark.background,
        theme_color: brandMark.background,
      },
    }),
  ],
  // Evolu's web package starts its database worker from a URL next to its own module, which prebundling would move.
  optimizeDeps: { exclude: ["@evolu/web"] },
  worker: { format: "es" },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.includes("node_modules") ? "vendor" : undefined,
      },
    },
  },
  server: { port: 5280, strictPort: true },
  preview: { port: 5280, strictPort: true },
});
