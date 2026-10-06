import * as UI from "@platitprosim/ui";
import type { Section } from "../section";

export const setup: Section = {
  title: "Setup",
  entries: {
    UIProvider: () => (
      <UI.Text muted>
        Wraps the app once with the active color mode: {"<UIProvider "}
        mode=&quot;dark&quot;{">"}. The book itself is rendered inside one.
      </UI.Text>
    ),
    Theme: () => (
      <UI.Row flexWrap="wrap">
        {(["light", "dark"] as const).map((name) => (
          <UI.Theme key={name} name={name}>
            <UI.Card flex={1} minWidth={200} backgroundColor="$background">
              <UI.Text variant="label">{name} theme</UI.Text>
              <UI.Button size="sm" alignSelf="flex-start">
                Primary
              </UI.Button>
            </UI.Card>
          </UI.Theme>
        ))}
      </UI.Row>
    ),
  },
};
