import {
  Button,
  Card,
  Dialog,
  ListRow,
  Screen,
  Section,
  SegmentedControl,
  Text,
} from "@platitprosim/ui";
import { useState } from "react";
import { themes, useThemeSetting } from "../colorMode";
import type { ThemeSetting } from "../colorMode";
import { appConfig } from "../config";
import { useI18n } from "../i18n";
import type { I18nKey } from "../i18n";
import { navigateTo } from "../routing";
import { resetDevice, saveSetting, saveShop, useAppEvolu } from "../storage";
import type { ShopProfile } from "../storage";
import { BackupPhrase } from "./BackupPhrase";
import { LanguageSwitch } from "./LanguageSwitch";
import { ShopFields } from "./ShopFields";
import { useShopForm } from "./shopForm";

type OpenDialog = "shop" | "backupConfirm" | "backup" | "restore" | "reset";

const themeLabels: Record<ThemeSetting, I18nKey> = {
  system: "themeSystem",
  light: "themeLight",
  dark: "themeDark",
};

export function SettingsScreen({ profile }: { profile: ShopProfile }) {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const theme = useThemeSetting();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const close = () => setDialog(null);
  const owner = profile.role === "owner";

  return (
    <Screen width="narrow" testID="settings-screen">
      <Text variant="heading" role="heading">
        {t("sectionSettings")}
      </Text>
      <Section title={t("settingsLanguage")}>
        <LanguageSwitch />
      </Section>
      <Section title={t("settingsTheme")}>
        <SegmentedControl
          accessibilityLabel={t("settingsTheme")}
          value={theme}
          onValueChange={(next) => void saveSetting(evolu, "theme", next)}
          options={themes.map((value) => ({
            value,
            label: t(themeLabels[value]),
          }))}
        />
      </Section>
      <Section title={t("settingsShop")}>
        <Card paddingVertical="$sm" gap="$none">
          <ListRow
            testID="settings-shop"
            icon="Store"
            title={profile.name}
            description={profile.accountDisplay}
            onPress={owner ? () => setDialog("shop") : undefined}
          />
        </Card>
      </Section>
      <Section title={t("settingsSecurity")}>
        <Card paddingVertical="$sm" gap="$none">
          <ListRow
            testID="settings-backup"
            icon="KeyRound"
            title={t("settingsBackupPhrase")}
            onPress={() => setDialog("backupConfirm")}
          />
          <ListRow
            testID="settings-restore"
            icon="RotateCcw"
            title={t("settingsRestore")}
            onPress={() => setDialog("restore")}
          />
          <ListRow
            testID="settings-reset"
            icon="Trash2"
            title={t("settingsReset")}
            destructive
            onPress={() => setDialog("reset")}
          />
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

      {dialog === "shop" ? (
        <EditShopDialog profile={profile} onClose={close} />
      ) : null}
      <ConfirmDialog
        open={dialog === "backupConfirm"}
        onClose={close}
        title={t("settingsBackupConfirmTitle")}
        description={t("settingsBackupConfirmDescription")}
        confirm={t("settingsBackupShow")}
        onConfirm={() => setDialog("backup")}
      />
      <Dialog
        open={dialog === "backup"}
        onOpenChange={(open) => (open ? undefined : close())}
        title={t("settingsBackupPhrase")}
        closeLabel={t("close")}
        testID="backup-dialog"
      >
        <BackupPhrase />
      </Dialog>
      <ConfirmDialog
        open={dialog === "restore"}
        onClose={close}
        title={t("settingsRestoreConfirmTitle")}
        description={t("settingsRestoreConfirmDescription")}
        confirm={t("settingsRestoreContinue")}
        destructive
        onConfirm={() => navigateTo("restore")}
      />
      <ConfirmDialog
        open={dialog === "reset"}
        onClose={close}
        title={t("settingsResetConfirmTitle")}
        description={t("settingsResetConfirmDescription")}
        confirm={t("settingsResetConfirm")}
        destructive
        onConfirm={() => void resetDevice(evolu)}
      />
    </Screen>
  );
}

function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirm,
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirm: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={title}
      description={description}
      actions={
        <>
          <Button
            testID="confirm-dialog-confirm"
            variant={destructive ? "danger" : "primary"}
            onPress={onConfirm}
          >
            {confirm}
          </Button>
          <Button variant="secondary" onPress={onClose}>
            {t("cancel")}
          </Button>
        </>
      }
    />
  );
}

function EditShopDialog({
  profile,
  onClose,
}: {
  profile: ShopProfile;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const form = useShopForm({
    name: profile.name,
    account: profile.accountDisplay,
  });
  const save = async () => {
    const details = form.submit();
    if (!details) return;
    await saveShop(evolu, details);
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={t("settingsShopEdit")}
      closeLabel={t("close")}
      testID="shop-dialog"
      actions={
        <Button testID="shop-save" onPress={() => void save()}>
          {t("save")}
        </Button>
      }
    >
      <ShopFields form={form} onSubmitEditing={() => void save()} />
    </Dialog>
  );
}
