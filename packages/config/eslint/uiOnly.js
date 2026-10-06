const fromLibrary =
  "UI comes from @platitprosim/ui; add a missing element to packages/ui.";

/**
 * ESTree types leave out JSX, so the two node shapes the rule reads are declared here.
 * @typedef {import("eslint").Rule.Node & { name: { type: string; name: string } }} JsxNamedNode
 * @typedef {JsxNamedNode & { parent: JsxNamedNode }} JsxAttributeNode
 */

const uiOnly = {
  /** @type {import("eslint").Rule.RuleMetaData} */
  meta: {
    type: "problem",
    docs: {
      description: "Require UI elements and icons from @platitprosim/ui.",
    },
    schema: [
      {
        type: "object",
        properties: { allow: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    messages: {
      element: `Do not render <{{name}}>. ${fromLibrary}`,
      className: `Do not style with className. ${fromLibrary}`,
      style: `Do not set style on <{{name}}>; use token props. ${fromLibrary}`,
      icons:
        "Take icons from @platitprosim/ui (<Icon name=…>), not lucide directly.",
    },
  },
  /** @param {import("eslint").Rule.RuleContext} context */
  create(context) {
    const allowed = new Set(context.options[0]?.allow ?? []);
    /** @param {JsxNamedNode} node */
    const intrinsic = (node) =>
      node.name.type === "JSXIdentifier" && /^[a-z]/.test(node.name.name);
    return {
      /** @param {JsxNamedNode} node */
      JSXOpeningElement(node) {
        if (intrinsic(node) && !allowed.has(node.name.name)) {
          context.report({
            node,
            messageId: "element",
            data: { name: node.name.name },
          });
        }
      },
      /** @param {JsxAttributeNode} node */
      JSXAttribute(node) {
        if (node.name.name === "className") {
          context.report({ node, messageId: "className" });
        } else if (node.name.name === "style") {
          context.report({
            node,
            messageId: "style",
            data: { name: node.parent.name.name },
          });
        }
      },
      /** @param {import("eslint").Rule.Node & { source: { value: unknown } }} node */
      ImportDeclaration(node) {
        if (/^lucide-react(-native)?($|\/)/.test(String(node.source.value))) {
          context.report({ node, messageId: "icons" });
        }
      },
    };
  },
};

export const uiOnlyPlugin = {
  meta: { name: "platitprosim-ui" },
  rules: { "ui-only": uiOnly },
};
