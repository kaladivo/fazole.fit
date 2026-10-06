import {
  ListRow,
  MnemonicGrid,
  Section,
  Stack,
  Text,
  TopBar,
} from "@platitprosim/ui";
import type { ReactNode } from "react";
import { useSite } from "../../site/site";
import { DemoBody, DemoScreen } from "../chrome";

/** Made-up words, never a real wallet's phrase. */
const demoWords = [
  "orbit",
  "velvet",
  "harbor",
  "cactus",
  "ripple",
  "meadow",
  "lunar",
  "copper",
  "breeze",
  "anchor",
  "violin",
  "summer",
];

/** Settings with the backup phrase: the one thing that restores everything. */
export function SettingsMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, toggleLocale } = useSite();
  const t = copy.demo;
  return (
    <DemoScreen tabBar={tabBar}>
      <TopBar title={t.tabs.settings} subtitle={t.shopName} />
      <DemoBody>
        <Section title={t.backupPhrase}>
          <Stack gap="$md">
            <MnemonicGrid
              words={demoWords}
              accessibilityLabel={t.backupPhrase}
              wordLabel={t.word}
              columns={2}
            />
            <Text variant="caption" muted>
              {t.backupNote}
            </Text>
          </Stack>
        </Section>
        <Stack gap="$none">
          <ListRow
            icon="Languages"
            title={t.language}
            value={t.languageValue}
            onPress={toggleLocale}
          />
          <ListRow icon="Store" title={t.shop} value={t.shopName} />
        </Stack>
      </DemoBody>
    </DemoScreen>
  );
}
