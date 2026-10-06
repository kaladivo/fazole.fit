import { platitprosimUi } from "@platitprosim/ui/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";

const defaultSiteUrl = "https://platitprosim.cz";

/** Fills `%SITE_URL%` in index.html, so canonical and Open Graph URLs are absolute. */
const siteUrl = (url: string): Plugin => ({
  name: "site-url",
  transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", url),
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [
      platitprosimUi(),
      react(),
      siteUrl((env.VITE_SITE_URL || defaultSiteUrl).replace(/\/$/u, "")),
    ],
    server: { port: 5300, strictPort: true },
    preview: { port: 5300, strictPort: true },
  };
});
