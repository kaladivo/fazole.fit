import { Button, Screen, Stack, Text } from "@platitprosim/ui";
import { useI18n } from "../i18n";
import { navigateTo } from "../routing";
import { BackupPhrase } from "./BackupPhrase";

/** Shown once after the shop is set up; Settings shows the phrase again. */
export function BackupScreen() {
  const { t } = useI18n();
  return (
    <Screen width="narrow" testID="backup-screen">
      <Text variant="heading" role="heading" paddingTop="$lg">
        {t("backupTitle")}
      </Text>
      <BackupPhrase />
      <Stack gap="$sm">
        <Button
          testID="backup-done"
          size="lg"
          icon="Check"
          onPress={() => navigateTo("terminal")}
        >
          {t("backupDone")}
        </Button>
        <Button
          testID="backup-later"
          variant="ghost"
          onPress={() => navigateTo("terminal")}
        >
          {t("backupLater")}
        </Button>
        <Text variant="caption" muted textAlign="center">
          {t("backupLaterHint")}
        </Text>
      </Stack>
    </Screen>
  );
}
