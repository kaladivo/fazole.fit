import { useState } from "react";
import * as UI from "@platitprosim/ui";
import { componentSections, tokens } from "./sections";

const systemMode = (): UI.ColorMode =>
  matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function App() {
  const [mode, setMode] = useState<UI.ColorMode>(systemMode);
  const count = componentSections.reduce(
    (total, section) => total + Object.keys(section.entries).length,
    0,
  );
  return (
    <UI.UIProvider mode={mode}>
      <UI.Screen width="content">
        <UI.Row justifyContent="space-between" flexWrap="wrap">
          <UI.Row gap="$md">
            <UI.BrandMark size="control" />
            <UI.Stack gap="$none">
              <UI.Row gap="$sm" role="heading">
                <UI.Wordmark size="heading" />
                <UI.Text variant="heading">UI</UI.Text>
              </UI.Row>
              <UI.Text variant="caption" muted>
                {count} components · {mode} mode
              </UI.Text>
            </UI.Stack>
          </UI.Row>
          <UI.Stack width="$picker">
            <UI.SegmentedControl
              accessibilityLabel="Color mode"
              value={mode}
              onValueChange={setMode}
              options={[
                { value: "light", label: "Light", icon: "Sun" },
                { value: "dark", label: "Dark", icon: "Moon" },
              ]}
            />
          </UI.Stack>
        </UI.Row>
        {[tokens, ...componentSections].map((section) => (
          <UI.Stack
            key={section.title}
            gap="$lg"
            testID={`category-${section.title}`}
          >
            <UI.Text variant="title" role="heading" marginTop="$lg">
              {section.title}
            </UI.Text>
            {Object.entries(section.entries).map(([name, Example]) => (
              <UI.Card key={name} testID={`entry-${name}`} gap="$lg">
                <UI.Text variant="label" muted role="heading">
                  {name}
                </UI.Text>
                <Example />
              </UI.Card>
            ))}
          </UI.Stack>
        ))}
      </UI.Screen>
    </UI.UIProvider>
  );
}
