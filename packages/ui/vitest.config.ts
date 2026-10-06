import { defineConfig } from "vitest/config";
import { platitprosimUi } from "./vite";

export default defineConfig({
  plugins: [platitprosimUi()],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    // Node cannot load React Native sources; inlining sends them through the react-native-web aliases.
    server: {
      deps: { inline: [/tamagui/, /react-native/, /lucide-react-native/] },
    },
  },
});
