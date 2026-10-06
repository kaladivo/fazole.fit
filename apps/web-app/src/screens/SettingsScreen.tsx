import {
  Avatar,
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
import { useI18n } from "../i18n";
import type { I18nKey } from "../i18n";
import { navigateTo } from "../routing";
import { shortNpub } from "@platitprosim/core";
import type { Pubkey } from "@linky-fit/linkstr";
import { useAppServices, useProfileOf } from "../services";
import {
  needsForward,
  resetDevice,
  saveSetting,
  saveShop,
  useAppEvolu,
  usePayments,
  useStoredMembership,
} from "../storage";
import type { ShopProfile } from "../storage";
import { ConfirmDialog } from "./ConfirmDialog";
import { BackupPhrase } from "./BackupPhrase";
import { LanguageSwitch } from "./LanguageSwitch";
import { ShopFields } from "./ShopFields";
import { useShopForm } from "./shopForm";

type OpenDialog =
  | "shop"
  | "backupConfirm"
  | "backup"
  | "restore"
  | "reset"
  | "leave";

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
  const membership = useStoredMembership();
  const forwarding = usePayments().some(needsForward);

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
      {!owner && membership?.employeePubkey ? (
        <Section title={t("settingsLinky")}>
          <Card paddingVertical="$sm" gap="$none">
            <LinkyRow
              pubkey={membership.employeePubkey}
              name={membership.employeeName}
            />
          </Card>
        </Section>
      ) : null}
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
          {owner ? (
            <ListRow
              testID="settings-reset"
              icon="Trash2"
              title={t("settingsReset")}
              destructive
              onPress={() => setDialog("reset")}
            />
          ) : (
            <ListRow
              testID="settings-leave"
              icon="LogOut"
              title={t("settingsLeave")}
              description={
                forwarding ? t("employeeForwardingFunds") : undefined
              }
              destructive
              disabled={forwarding}
              onPress={() => setDialog("leave")}
            />
          )}
        </Card>
      </Section>
      <Section title={t("settingsAbout")}>
        <Card paddingVertical="$sm" gap="$none">
          <ListRow
            icon="Bitcoin"
            title={t("settingsMint")}
            value={new URL(profile.mintUrl).host}
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
      <ConfirmDialog
        open={dialog === "leave"}
        onClose={close}
        title={t("settingsLeaveConfirmTitle", { shop: profile.name })}
        description={t("settingsLeaveConfirmDescription")}
        confirm={t("settingsLeaveConfirm")}
        destructive
        onConfirm={() => void resetDevice(evolu)}
      />
    </Screen>
  );
}

/** The employee's Linky identity this device acts for. */
function LinkyRow({ pubkey, name }: { pubkey: Pubkey; name: string | null }) {
  const { profiles } = useAppServices();
  const profile = useProfileOf(profiles, pubkey);
  const shown = profile?.name ?? name ?? shortNpub(pubkey);
  return (
    <ListRow
      testID="settings-linky"
      leading={<Avatar name={shown} uri={profile?.picture ?? undefined} />}
      title={shown}
      description={shortNpub(pubkey)}
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
