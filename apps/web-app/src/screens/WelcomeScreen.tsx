import {
  BrandMark,
  Card,
  ListRow,
  Screen,
  Stack,
  Text,
  Wordmark,
} from "@platitprosim/ui";
import { useI18n } from "../i18n";
import { navigateTo } from "../routing";
import { LanguageSwitch } from "./LanguageSwitch";

export function WelcomeScreen() {
  const { t } = useI18n();
  return (
    <Screen width="narrow" centered testID="welcome-screen">
      <Stack alignItems="center" gap="$lg" paddingVertical="$xl">
        <BrandMark size="hero" />
        <Stack alignItems="center" gap="$sm">
          <Wordmark size="display" />
          <Text muted textAlign="center">
            {t("appTagline")}
          </Text>
        </Stack>
      </Stack>
      <Card gap="$xs" paddingVertical="$sm">
        <ListRow
          testID="welcome-setup-shop"
          icon="Store"
          title={t("welcomeSetupShop")}
          description={t("welcomeSetupShopDescription")}
          onPress={() => navigateTo("setup")}
        />
        <ListRow
          testID="welcome-employee"
          icon="Users"
          title={t("welcomeEmployee")}
          description={t("welcomeEmployeeDescription")}
          onPress={() => navigateTo("employee")}
        />
        <ListRow
          testID="welcome-restore"
          icon="KeyRound"
          title={t("welcomeRestore")}
          description={t("welcomeRestoreDescription")}
          onPress={() => navigateTo("restore")}
        />
      </Card>
      <Stack width="$picker" alignSelf="center">
        <LanguageSwitch />
      </Stack>
    </Screen>
  );
}
