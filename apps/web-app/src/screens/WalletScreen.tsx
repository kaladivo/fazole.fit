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
import type { Employee } from "../storage";
import {
  useEmployees,
  usePayments,
  useReceipts,
  useWalletBalance,
  useWithdrawals,
} from "../storage";
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
  const activity = walletActivity(
    usePayments(),
    useReceipts(),
    useWithdrawals(),
  );
  const employees = useEmployees();
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
              <ActivityRow key={item.id} item={item} employees={employees} />
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

const activityLabel = (
  item: WalletActivity,
  employees: readonly Employee[],
  t: Translate,
) => {
  switch (item.kind) {
    case "lightning":
      return t(methodLabels.lightning);
    case "receipt": {
      const { receipt } = item;
      if (receipt.kind === "cashu") {
        return t(
          receipt.paymentId === null ? "receiptUnassigned" : methodLabels.cashu,
        );
      }
      const name = employees.find(({ id }) => id === receipt.employeeId)?.name;
      return name
        ? t("receiptForwarded", { name })
        : t("receiptForwardedDevice");
    }
    case "withdrawal":
      return t(
        item.withdrawal.kind === "lightning"
          ? "withdrawalLightning"
          : "withdrawalLinky",
      );
  }
};

const activityIcon = (item: WalletActivity) =>
  item.kind === "lightning"
    ? methodIcons.lightning
    : item.kind === "receipt"
      ? item.receipt.kind === "forward"
        ? "Users"
        : methodIcons.cashu
      : item.withdrawal.kind === "lightning"
        ? "Zap"
        : "Send";

function ActivityRow({
  item,
  employees,
}: {
  item: WalletActivity;
  employees: readonly Employee[];
}) {
  const { lang, t } = useI18n();
  const sats = formatWhole(item.sats, lang);
  const status = item.kind === "withdrawal" ? item.withdrawal.status : "done";
  const row = t("activityRow", {
    date: formatDateTime(item.atMs, lang),
    label: activityLabel(item, employees, t),
  });
  return (
    <ListRow
      testID={`activity-${item.id}`}
      icon={activityIcon(item)}
      title={t(item.kind === "withdrawal" ? "activityOut" : "activityIn", {
        sats,
      })}
      description={
        item.feeSats > 0
          ? t("activityRowFee", {
              row,
              fee: formatWhole(item.feeSats, lang),
            })
          : row
      }
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
