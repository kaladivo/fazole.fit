import {
  Card,
  ListRow,
  MnemonicGrid,
  Notice,
  Screen,
  Section,
  SegmentedControl,
  Stack,
  Text,
} from "@platitprosim/ui";
import type { ColorMode } from "@platitprosim/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "../../copy";
import { useSite } from "../../site/site";
import { DemoScreen, DemoSheet } from "../chrome";
import { demoAccount } from "../qr";

/** Made-up words, never a real wallet's phrase. */
const demoWords = [
  "orbit",
  "velvet",
  "harbor",
  "cactus",
  "ripple",
  "maple",
  "lunar",
  "copper",
  "breeze",
  "anchor",
  "violin",
  "summer",
  "pepper",
  "glacier",
  "timber",
  "falcon",
  "marble",
  "canyon",
  "lemon",
  "saddle",
  "pilot",
  "ember",
  "willow",
  "quartz",
];

type Theme = "system" | ColorMode;

/** Settings, like the app's: language, appearance, the shop and the backup phrase that restores everything. */
export function SettingsMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, locale, toggleLocale, mode, toggleMode } = useSite();
  const t = copy.demo;
  const [theme, setTheme] = useState<Theme>("system");
  const [showingPhrase, setShowingPhrase] = useState(false);
  const pickTheme = (next: Theme) => {
    setTheme(next);
    if (next !== "system" && next !== mode) toggleMode();
  };
  return (
    <DemoScreen
      tabBar={tabBar}
      overlay={
        <DemoSheet
          dialog
          open={showingPhrase}
          onClose={() => setShowingPhrase(false)}
          title={t.backupPhrase}
        >
          <Stack gap="$lg">
            <Text muted>{t.backupNote}</Text>
            <MnemonicGrid
              words={demoWords}
              accessibilityLabel={t.backupWords}
              wordLabel={t.word}
              // The phone is always narrow, even when the page is wide.
              columns={2}
            />
            <Notice tone="warning" title={t.backupWarning} />
          </Stack>
        </DemoSheet>
      }
    >
      <Screen width="narrow">
        <Text variant="heading" role="heading">
          {t.tabs.settings}
        </Text>
        <Section title={t.language}>
          <SegmentedControl
            accessibilityLabel={t.language}
            value={locale}
            onValueChange={(next: Locale) => {
              if (next !== locale) toggleLocale();
            }}
            options={[
              { value: "cs", label: t.languageCs },
              { value: "en", label: t.languageEn },
            ]}
          />
        </Section>
        <Section title={t.theme}>
          <SegmentedControl
            accessibilityLabel={t.theme}
            value={theme}
            onValueChange={pickTheme}
            options={[
              { value: "system", label: t.themeSystem },
              { value: "light", label: t.themeLight },
              { value: "dark", label: t.themeDark },
            ]}
          />
        </Section>
        <Section title={t.shop}>
          <Card paddingVertical="$sm" gap="$none">
            <ListRow
              icon="Store"
              title={t.shopName}
              description={demoAccount.display}
              chevron
            />
          </Card>
        </Section>
        <Section title={t.security}>
          <Card paddingVertical="$sm" gap="$none">
            <ListRow
              icon="KeyRound"
              title={t.backupPhrase}
              onPress={() => setShowingPhrase(true)}
            />
            <ListRow icon="RotateCcw" title={t.restore} chevron />
            <ListRow icon="Trash2" title={t.reset} destructive chevron />
          </Card>
        </Section>
        <Section title={t.about}>
          <Card paddingVertical="$sm" gap="$none">
            <ListRow icon="Bitcoin" title={t.mint} value="cashu.cz" />
          </Card>
        </Section>
      </Screen>
    </DemoScreen>
  );
}
