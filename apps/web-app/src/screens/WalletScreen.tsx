import { satsToCzk } from "@platitprosim/core";
import {
  AmountDisplay,
  Button,
  Card,
  EmptyState,
  ListRow,
  Pill,
  Screen,
  Section,
  Stack,
  Text,
} from "@platitprosim/ui";
import { useState } from "react";
import { useI18n } from "../i18n";
import type { Translate } from "../i18n";
import { formatCzkValue, formatDateTime, formatWhole } from "../i18n/format";
import { useCzkRate } from "../services";
import { usePayments, useWalletBalance, useWithdrawals } from "../storage";
import { walletActivity } from "../wallet/activity";
import type { WalletActivity } from "../wallet/activity";
import { methodIcons, methodLabels } from "./paymentLabels";
import { SendToLinkySheet } from "./SendToLinkySheet";
import { WithdrawSheet } from "./WithdrawSheet";

type Sheet = "withdraw" | "linky" | null;

export function WalletScreen() {
  const { lang, t } = useI18n();
  const balance = useWalletBalance();
  const rate = useCzkRate();
  const activity = walletActivity(usePayments(), useWithdrawals());
  const [sheet, setSheet] = useState<Sheet>(null);
  const czkPerBtc = rate.status === "ready" ? rate.czkPerBtc : null;
  const closeSheet = (open: boolean) => {
    if (!open) setSheet(null);
  };

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
          testID="wallet-balance"
          value={formatWhole(balance, lang)}
          unit={t("currencySats")}
          secondary={
            czkPerBtc !== null
              ? t("walletBalanceCzk", {
                  amount: formatCzkValue(satsToCzk(balance, czkPerBtc), lang),
                })
              : rate.status === "failed"
                ? t("walletRateUnavailable")
                : undefined
          }
          placeholder={balance === 0}
        />
      </Card>
      <Stack gap="$sm">
        <Button
          testID="wallet-withdraw"
          size="lg"
          icon="Zap"
          disabled={balance === 0}
          onPress={() => setSheet("withdraw")}
        >
          {t("walletWithdraw")}
        </Button>
        <Button
          testID="wallet-send-to-linky"
          size="lg"
          variant="secondary"
          icon="Send"
          disabled={balance === 0}
          onPress={() => setSheet("linky")}
        >
          {t("walletSendToLinky")}
        </Button>
      </Stack>
      <Section title={t("walletActivity")}>
        {activity.length === 0 ? (
          <EmptyState
            icon="History"
            title={t("walletActivityEmptyTitle")}
            description={t("walletActivityEmptyDescription")}
          />
        ) : (
          <Card paddingVertical="$sm" gap="$none">
            {activity.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </Card>
        )}
      </Section>
      <WithdrawSheet
        open={sheet === "withdraw"}
        onOpenChange={closeSheet}
        balance={balance}
        czkPerBtc={czkPerBtc}
      />
      <SendToLinkySheet
        open={sheet === "linky"}
        onOpenChange={closeSheet}
        balance={balance}
        czkPerBtc={czkPerBtc}
      />
    </Screen>
  );
}

const activityLabel = (item: WalletActivity, t: Translate) =>
  item.kind === "payment"
    ? t(methodLabels[item.method])
    : t(
        item.withdrawal.kind === "lightning"
          ? "withdrawalLightning"
          : "withdrawalLinky",
      );

function ActivityRow({ item }: { item: WalletActivity }) {
  const { lang, t } = useI18n();
  const sats = formatWhole(item.sats, lang);
  const status = item.kind === "withdrawal" ? item.withdrawal.status : "done";
  return (
    <ListRow
      testID={`activity-${item.id}`}
      icon={
        item.kind === "payment"
          ? methodIcons[item.method]
          : item.withdrawal.kind === "lightning"
            ? "Zap"
            : "Send"
      }
      title={t(item.kind === "payment" ? "activityIn" : "activityOut", {
        sats,
      })}
      description={t("activityRow", {
        date: formatDateTime(item.atMs, lang),
        label: activityLabel(item, t),
      })}
      trailing={
        status === "pending" ? (
          <Pill label={t("withdrawalPending")} tone="warning" busy />
        ) : status === "failed" ? (
          <Pill label={t("withdrawalFailed")} tone="danger" />
        ) : undefined
      }
      chevron={false}
    />
  );
}
