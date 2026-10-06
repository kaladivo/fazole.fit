import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";
import { componentSections } from "./sections";

test("every public component has exactly one book entry", () => {
  const source = ts.createSourceFile(
    "index.ts",
    readFileSync(
      resolve(import.meta.dirname, "../../../packages/ui/src/index.ts"),
      "utf8",
    ),
    ts.ScriptTarget.Latest,
  );
  const components = source.statements.flatMap((node) =>
    ts.isExportDeclaration(node) &&
    !node.isTypeOnly &&
    node.exportClause &&
    ts.isNamedExports(node.exportClause)
      ? node.exportClause.elements
          .filter((item) => !item.isTypeOnly && /^[A-Z]/u.test(item.name.text))
          .map((item) => item.name.text)
      : [],
  );
  const entries = componentSections.flatMap((section) =>
    Object.keys(section.entries),
  );
  expect(entries.sort()).toEqual(components.sort());
});
