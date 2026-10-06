import { Button, Screen, Stack, Text, TopBar } from "@platitprosim/ui";
import { useState } from "react";
import { useI18n } from "../i18n";
import { navigateTo } from "../routing";
import { saveShop, useAppEvolu } from "../storage";
import { BackButton } from "./BackButton";
import { ShopFields } from "./ShopFields";
import { useShopForm } from "./shopForm";

export function SetupShopScreen() {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const form = useShopForm();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const details = form.submit();
    if (!details) return;
    setSaving(true);
    await saveShop(evolu, details);
    navigateTo("backup");
  };

  return (
    <Stack flex={1} gap="$none">
      <TopBar leading={<BackButton to="welcome" />} />
      <Screen width="narrow" testID="setup-screen">
        <Stack gap="$sm">
          <Text variant="heading" role="heading">
            {t("setupTitle")}
          </Text>
          <Text muted>{t("setupDescription")}</Text>
        </Stack>
        <ShopFields form={form} onSubmitEditing={() => void submit()} />
        <Button
          testID="setup-continue"
          size="lg"
          loading={saving}
          onPress={() => void submit()}
        >
          {t("setupContinue")}
        </Button>
      </Screen>
    </Stack>
  );
}
