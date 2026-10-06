import webAppEslintConfig, {
  browserStorageGlobals,
  browserStorageSyntax,
  restrictedSyntax,
  testHelperImportIgnores,
  uiOnlyPlugin,
} from "@platitprosim/config/eslint";
import { defineConfig } from "eslint/config";

const navigateMessage = "Navigate with navigateTo() from src/routing.ts.";
const navigationSyntax = [
  {
    selector:
      "AssignmentExpression[left.property.name=/^(hash|href)$/][left.object.property.name='location']",
    message: navigateMessage,
  },
  {
    selector:
      "AssignmentExpression[left.property.name=/^(hash|href)$/][left.object.name='location']",
    message: navigateMessage,
  },
];

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
        ...navigationSyntax,
      ],
    },
  },
  {
    files: ["src/routing.ts"],
    rules: {
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
    rules: { "platitprosim-ui/ui-only": "error" },
  },
]);
