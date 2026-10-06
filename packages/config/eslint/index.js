import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export { uiOnlyPlugin } from "./uiOnly.js";

export const testHelperImportPatterns = [
  {
    group: [
      "@platitprosim/*/testing",
      "@platitprosim/*/testing/*",
      "**/testing",
      "**/testing/*",
    ],
    message: "Production code never imports test helpers.",
  },
];

export const testHelperImportIgnores = [
  "**/*.test.{ts,tsx}",
  "**/testing/**",
  "tests/**",
];

export const restrictedSyntax = [
  {
    selector: "TSAsExpression > TSAnyKeyword",
    message:
      "Do not use `as any`. Keep the value typed and narrow with runtime guards.",
  },
  {
    selector: "TSTypeAssertion > TSAnyKeyword",
    message:
      "Do not use `<any>` assertions. Keep the value typed and narrow with runtime guards.",
  },
  {
    selector: "TSArrayType > TSUnknownKeyword",
    message:
      "Do not use `unknown[]` placeholders. Use a concrete element type or narrow individual `unknown` values with guard functions.",
  },
  {
    selector:
      "TSTypeReference[typeName.name=/^(Array|ReadonlyArray|Promise)$/] > TSTypeParameterInstantiation > TSUnknownKeyword",
    message:
      "Do not use `Array<unknown>`, `ReadonlyArray<unknown>` or `Promise<unknown>` placeholders. Use a concrete type and keep `unknown` at parse/input boundaries before guard narrowing.",
  },
];

const storageMessage =
  "All app data lives in Evolu; never write browser storage directly.";

/** Bans direct browser storage: Evolu is the only store (docs/SPEC.md, Storage rules). */
export const browserStorageGlobals = [
  "localStorage",
  "sessionStorage",
  "indexedDB",
].map((name) => ({ name, message: storageMessage }));

export const browserStorageSyntax = [
  {
    selector:
      "MemberExpression[object.name=/^(window|globalThis|self)$/][property.name=/^(localStorage|sessionStorage|indexedDB)$/]",
    message: storageMessage,
  },
];

export const webAppEslintConfig = defineConfig([
  globalIgnores(["dist", "dev-dist", "coverage"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    ignores: testHelperImportIgnores,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: testHelperImportPatterns },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/no-explicit-any": [
        "error",
        { fixToUnknown: false, ignoreRestArgs: false },
      ],
      "no-restricted-syntax": ["error", ...restrictedSyntax],
    },
  },
]);

export default webAppEslintConfig;
