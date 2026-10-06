import webAppEslintConfig, {
  testHelperImportIgnores,
  uiOnlyPlugin,
} from "@platitprosim/config/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...webAppEslintConfig,
  {
    files: ["src/**/*.tsx"],
    ignores: testHelperImportIgnores,
    plugins: { "platitprosim-ui": uiOnlyPlugin },
    rules: { "platitprosim-ui/ui-only": "error" },
  },
]);
