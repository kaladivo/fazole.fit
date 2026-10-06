import webAppEslintConfig, {
  browserStorageGlobals,
  browserStorageSyntax,
  restrictedSyntax,
  testHelperImportIgnores,
  uiOnlyPlugin,
} from "@platitprosim/config/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...webAppEslintConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", ...browserStorageGlobals],
      "no-restricted-syntax": [
        "error",
        ...restrictedSyntax,
        ...browserStorageSyntax,
      ],
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: testHelperImportIgnores,
    plugins: { "platitprosim-ui": uiOnlyPlugin },
    // A website needs real links; Tamagui renders them through `render={<a … />}`.
    rules: { "platitprosim-ui/ui-only": ["error", { allow: ["a"] }] },
  },
]);
