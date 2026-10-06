import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";
import { brandMark } from "@platitprosim/ui/tokens";

const tile = { padding: 0, resizeOptions: { background: brandMark.color } };

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...tile },
    apple: { ...minimal2023Preset.apple, ...tile },
  },
  images: ["public/logo.svg"],
});
