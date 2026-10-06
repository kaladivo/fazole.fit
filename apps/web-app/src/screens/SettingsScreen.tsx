import { Card, ListRow, Screen, Section, Text } from "@platitprosim/ui";
import { appConfig } from "../config";
import { useI18n } from "../i18n";
import { LanguageSwitch } from "./LanguageSwitch";

export function SettingsScreen() {
  const { t } = useI18n();
  return (
    <Screen width="narrow" testID="settings-screen">
      <Text variant="heading" role="heading">
        {t("sectionSettings")}
      </Text>
      <Section title={t("settingsLanguage")}>
        <LanguageSwitch />
      </Section>
      <Section title={t("settingsShop")}>
        <Card paddingVertical="$sm" gap="$none">
          <ListRow
            icon="Store"
            title={t("settingsShopDetails")}
            value={t("comingSoon")}
            disabled
          />
        </Card>
      </Section>
      <Section title={t("settingsSecurity")}>
        <Card paddingVertical="$sm" gap="$none">
          <ListRow
            icon="KeyRound"
            title={t("settingsBackupPhrase")}
            value={t("comingSoon")}
          />
          <ListRow
            icon="RotateCcw"
            title={t("settingsRestore")}
            value={t("comingSoon")}
          />
          <ListRow icon="Trash2" title={t("settingsReset")} destructive />
        </Card>
      </Section>
      <Section title={t("settingsAbout")}>
        <Card paddingVertical="$sm" gap="$none">
          <ListRow
            icon="Bitcoin"
            title={t("settingsMint")}
            value={new URL(appConfig.mintUrl).host}
          />
        </Card>
      </Section>
    </Screen>
  );
}
