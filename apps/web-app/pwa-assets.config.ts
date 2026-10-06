import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

const tile = { padding: 0, resizeOptions: { background: "#4f46e5" } };

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...tile },
    apple: { ...minimal2023Preset.apple, ...tile },
  },
  images: ["public/logo.svg"],
});
