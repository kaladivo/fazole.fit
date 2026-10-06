import * as UI from "@platitprosim/ui";
import { Box } from "../Box";
import type { Section } from "../section";

export const layout: Section = {
  title: "Layout and type",
  entries: {
    Screen: () => (
      <UI.Stack
        height={180}
        borderRadius="$control"
        overflow="hidden"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <UI.Screen width="narrow" centered>
          <UI.Text variant="title" textAlign="center">
            A centred, narrow screen
          </UI.Text>
          <UI.Text muted textAlign="center">
            480 px max, with the app gutter.
          </UI.Text>
        </UI.Screen>
      </UI.Stack>
    ),
    Stack: () => (
      <UI.Stack>
        <Box label="One" />
        <Box label="Two" />
      </UI.Stack>
    ),
    Row: () => (
      <UI.Row>
        <Box label="Start" />
        <UI.Spacer />
        <Box label="End" />
      </UI.Row>
    ),
    Spacer: () => (
      <UI.Row>
        <Box label="Pushed apart" />
        <UI.Spacer />
        <Box label="by a Spacer" />
      </UI.Row>
    ),
    Card: () => (
      <UI.Stack>
        <UI.Card backgroundColor="$background">
          <UI.Text variant="title">Default card</UI.Text>
          <UI.Text muted>Surface with a hairline border.</UI.Text>
        </UI.Card>
        <UI.Card tone="accent">
          <UI.Text variant="title">Accent card</UI.Text>
          <UI.Text muted>For highlighted summaries.</UI.Text>
        </UI.Card>
      </UI.Stack>
    ),
    Section: () => (
      <UI.Section
        title="Today"
        trailing={
          <UI.Button size="sm" variant="ghost">
            See all
          </UI.Button>
        }
      >
        <UI.Text>Content of the section.</UI.Text>
      </UI.Section>
    ),
    Divider: () => (
      <UI.Stack>
        <UI.Text>Above</UI.Text>
        <UI.Divider />
        <UI.Text>Below</UI.Text>
      </UI.Stack>
    ),
    Text: () => (
      <UI.Stack gap="$xs">
        <UI.Text variant="heading">Heading</UI.Text>
        <UI.Text>Body text: Příliš žluťoučký kůň úpěl ďábelské ódy.</UI.Text>
        <UI.Text muted>Muted body text</UI.Text>
        <UI.Text eyebrow>Eyebrow</UI.Text>
        <UI.Text mono variant="caption">
          SPD*1.0*ACC:CZ6508000000192000145399
        </UI.Text>
      </UI.Stack>
    ),
    ScrollView: () => (
      <UI.ScrollView horizontal>
        <UI.Row>
          {["Dnes", "Včera", "Tento týden", "Tento měsíc", "Vše"].map(
            (label) => (
              <UI.Pill key={label} label={label} tone="accent" />
            ),
          )}
        </UI.Row>
      </UI.ScrollView>
    ),
    Icon: () => (
      <UI.Row flexWrap="wrap">
        {Object.keys(UI.icons)
          .filter((name): name is UI.IconName => name in UI.icons)
          .map((name) => (
            <UI.Icon key={name} name={name} color="$colorSubtle" />
          ))}
      </UI.Row>
    ),
    BrandMark: () => (
      <UI.Row alignItems="flex-end">
        <UI.BrandMark size="iconLg" />
        <UI.BrandMark size="control" />
        <UI.BrandMark size="hero" />
      </UI.Row>
    ),
    Wordmark: () => (
      <UI.Stack>
        <UI.Wordmark />
        <UI.Wordmark size="heading" />
        <UI.Wordmark size="display" />
        <UI.Wordmark size="amount" />
      </UI.Stack>
    ),
  },
};
