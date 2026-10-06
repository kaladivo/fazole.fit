import { Button, MnemonicGrid, Notice, Stack, Text } from "@platitprosim/ui";
import type { Tone } from "@platitprosim/ui";
import { useState } from "react";
import { useI18n } from "../i18n";
import type { I18nKey } from "../i18n";
import { saveToPasswordManager } from "../passwordManager";
import { useIdentity, useShopProfile } from "../storage";

type Feedback = "copied" | "copyFailed" | "saved" | "unsupported" | "failed";

const feedbackNotices: Record<Feedback, { title: I18nKey; tone: Tone }> = {
  copied: { title: "backupCopied", tone: "success" },
  copyFailed: { title: "backupCopyFailed", tone: "danger" },
  saved: { title: "backupSaveRequested", tone: "info" },
  unsupported: { title: "backupSaveUnavailable", tone: "warning" },
  failed: { title: "backupSaveFailed", tone: "danger" },
};

/** The install's backup phrase, masked until revealed, to save to a password manager or copy. */
export function BackupPhrase() {
  const { t } = useI18n();
  const { mnemonic, keys } = useIdentity();
  const shopName = useShopProfile()?.name ?? t("appName");
  const words = mnemonic.split(" ");
  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setFeedback("copied");
    } catch {
      setFeedback("copyFailed");
    }
  };
  const save = async () =>
    setFeedback(
      await saveToPasswordManager({
        id: `fazole.fit:${keys.nostr.npub}`,
        name: shopName,
        password: mnemonic,
      }),
    );

  const notice = feedback ? feedbackNotices[feedback] : null;
  return (
    <Stack gap="$lg">
      <Text muted>{t("backupDescription", { count: words.length })}</Text>
      <MnemonicGrid
        words={words}
        hidden={!visible}
        accessibilityLabel={t("backupWords")}
        wordLabel={(position) => t("backupWord", { position })}
      />
      <Stack gap="$sm">
        <Button
          testID="backup-save"
          variant="secondary"
          icon="ShieldCheck"
          onPress={() => void save()}
        >
          {t("backupSave")}
        </Button>
        <Button
          testID="backup-copy"
          variant="secondary"
          icon="Copy"
          onPress={() => void copy()}
        >
          {t("backupCopy")}
        </Button>
        <Button
          testID="backup-toggle"
          variant="ghost"
          icon={visible ? "EyeOff" : "Eye"}
          onPress={() => setVisible((current) => !current)}
        >
          {visible ? t("backupHide") : t("backupShow")}
        </Button>
      </Stack>
      {notice ? <Notice tone={notice.tone} title={t(notice.title)} /> : null}
      <Notice tone="warning" title={t("backupWarning")} />
    </Stack>
  );
}
