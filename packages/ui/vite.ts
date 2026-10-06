import { transformWithEsbuild } from "vite";
import type { Plugin } from "vite";

const extensions = [
  ".web.tsx",
  ".web.ts",
  ".web.jsx",
  ".web.js",
  ".web.mjs",
  ".tsx",
  ".ts",
  ".mts",
  ".jsx",
  ".js",
  ".mjs",
  ".json",
];

/** Resolves `@platitprosim/ui` and its React Native dependencies through react-native-web. */
export function platitprosimUi(): Plugin {
  return {
    name: "platitprosim-ui",
    enforce: "pre",
    config: (_config, { mode }) => ({
      // Tamagui and React Native read flags from process.env at module scope.
      define: {
        __DEV__: JSON.stringify(mode !== "production"),
        global: "globalThis",
        "process.env": "{}",
      },
      resolve: {
        extensions,
        dedupe: ["react", "react-dom", "react-native-web"],
        alias: [
          { find: /^react-native$/, replacement: "react-native-web" },
          {
            find: /^react-native-svg$/,
            replacement: "react-native-svg/lib/module/ReactNativeSVG.web.js",
          },
        ],
      },
      optimizeDeps: {
        esbuildOptions: {
          resolveExtensions: extensions,
          // react-native-qrcode-svg publishes JSX in plain .js files: this covers dev prebundling, `transform` covers builds.
          loader: { ".js": "jsx" },
        },
      },
    }),
    transform: (code, id) =>
      id.includes("/react-native-qrcode-svg/") && id.endsWith(".js")
        ? transformWithEsbuild(code, id, { loader: "jsx", jsx: "automatic" })
        : undefined,
  };
}
