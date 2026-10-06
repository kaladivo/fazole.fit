import {
  AmountDisplay,
  Button,
  Card,
  Screen,
  Stack,
  Text,
} from "@platitprosim/ui";
import { useI18n } from "../i18n";

export function WalletScreen() {
  const { t } = useI18n();
  return (
    <Screen width="narrow" testID="wallet-screen">
      <Text variant="heading" role="heading">
        {t("sectionWallet")}
      </Text>
      <Card alignItems="center" gap="$lg" paddingVertical="$xxl">
        <Text variant="label" muted>
          {t("walletBalance")}
        </Text>
        <AmountDisplay
          value="0"
          unit="sat"
          secondary={`0 ${t("currencyCzk")}`}
          placeholder
        />
      </Card>
      <Stack gap="$sm">
        <Button size="lg" icon="Zap" disabled>
          {t("walletWithdraw")}
        </Button>
        <Button size="lg" variant="secondary" icon="Send" disabled>
          {t("walletSendToLinky")}
        </Button>
      </Stack>
    </Screen>
  );
}
