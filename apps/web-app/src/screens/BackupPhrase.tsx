import { MnemonicGrid, Notice, Stack, Text } from "@platitprosim/ui";
import { useI18n } from "../i18n";
import { useIdentity } from "../storage";

/** The install's backup phrase to write down, with what it protects. */
export function BackupPhrase() {
  const { t } = useI18n();
  const words = useIdentity().mnemonic.split(" ");
  return (
    <Stack gap="$lg">
      <Text muted>{t("backupDescription", { count: words.length })}</Text>
      <MnemonicGrid
        words={words}
        accessibilityLabel={t("backupWords")}
        wordLabel={(position) => t("backupWord", { position })}
      />
      <Notice tone="warning" title={t("backupWarning")} />
    </Stack>
  );
}
