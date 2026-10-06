import { buildSpd } from "@platitprosim/core";
import {
  AmountDisplay,
  Button,
  Card,
  EmptyState,
  IconButton,
  Notice,
  QRCode,
  Screen,
  SegmentedControl,
  Stack,
  StatusBadge,
  SuccessOverlay,
  TopBar,
} from "@platitprosim/ui";
import { useState } from "react";
import { useI18n } from "../i18n";
import { formatCzkValue, formatTime } from "../i18n/format";
import { navigateTo } from "../routing";
import { changePaymentStatus, useAppEvolu, usePayment } from "../storage";
import type { Payment, ShopProfile } from "../storage";
import { DetailRows } from "./DetailRows";
import { statusLabels } from "./paymentLabels";

const toTerminal = () => navigateTo("terminal");

/** The customer-facing payment: Bank shows the SPD QR; Bitcoin arrives in a later slice. */
export function PaymentScreen({
  paymentId,
  profile,
}: {
  paymentId: string;
  profile: ShopProfile;
}) {
  const { t } = useI18n();
  const payment = usePayment(paymentId);
  return (
    <Stack flex={1} gap="$none">
      <TopBar
        title={t("payment")}
        leading={
          <IconButton
            icon="X"
            accessibilityLabel={t("close")}
            onPress={toTerminal}
          />
        }
      />
      {payment ? (
        <BankPayment payment={payment} profile={profile} />
      ) : (
        <Screen width="narrow" centered>
          <EmptyState
            icon="CircleAlert"
            title={t("paymentNotFound")}
            description={t("paymentNotFoundDescription")}
            action={<Button onPress={toTerminal}>{t("backToTerminal")}</Button>}
          />
        </Screen>
      )}
    </Stack>
  );
}

function BankPayment({
  payment,
  profile,
}: {
  payment: Payment;
  profile: ShopProfile;
}) {
  const { lang, t } = useI18n();
  const evolu = useAppEvolu();
  const [paidAtMs, setPaidAtMs] = useState<number | null>(null);
  const amount = formatCzkValue(payment.amountCzk, lang);
  const open = payment.status === "pending";

  const markPaid = async () => {
    const now = Date.now();
    await changePaymentStatus(evolu, payment, "paid", now);
    setPaidAtMs(now);
  };

  const cancel = async () => {
    await changePaymentStatus(evolu, payment, "cancelled");
    toTerminal();
  };

  return (
    <Screen width="narrow" testID="payment-screen">
      <SegmentedControl
        accessibilityLabel={t("paymentMethod")}
        size="lg"
        value="bank"
        onValueChange={() => {}}
        options={[
          { value: "bank", label: t("methodBank"), icon: "Landmark" },
          {
            value: "bitcoin",
            label: t("methodBitcoinSoon"),
            icon: "Bitcoin",
            disabled: true,
          },
        ]}
      />
      <Stack alignItems="center" gap="$lg">
        <QRCode
          testID="payment-qr"
          size="lg"
          logo="Landmark"
          accessibilityLabel={t("paymentBankQr", {
            amount: t("amountCzk", { amount }),
          })}
          value={buildSpd({
            iban: profile.iban,
            amount: payment.amountCzk,
            message: profile.name,
            ...(payment.vs ? { variableSymbol: payment.vs } : {}),
          })}
        />
        <AmountDisplay
          testID="payment-amount"
          value={amount}
          unit={t("currencyCzk")}
          size="md"
        />
      </Stack>
      <Card gap="$sm" paddingVertical="$lg">
        <DetailRows
          details={[
            ...(payment.vs
              ? [{ label: t("paymentVs"), value: payment.vs }]
              : []),
            { label: t("paymentAccount"), value: profile.accountDisplay },
            { label: t("paymentRecipient"), value: profile.name },
          ]}
        />
      </Card>
      {open ? (
        <Stack gap="$sm">
          <Button
            testID="payment-mark-paid"
            size="lg"
            icon="Check"
            onPress={() => void markPaid()}
          >
            {t("paymentMarkPaid")}
          </Button>
          <Button
            testID="payment-cancel"
            variant="ghost"
            onPress={() => void cancel()}
          >
            {t("paymentCancel")}
          </Button>
        </Stack>
      ) : paidAtMs !== null ? null : (
        <Stack gap="$md">
          <StatusBadge
            status={payment.status}
            label={t(statusLabels[payment.status])}
          />
          <Notice title={t("paymentClosed")} />
          <Button variant="secondary" onPress={toTerminal}>
            {t("backToTerminal")}
          </Button>
        </Stack>
      )}
      {paidAtMs !== null ? (
        <SuccessOverlay
          title={t("paymentPaidTitle")}
          amount={amount}
          unit={t("currencyCzk")}
          detail={t("paymentPaidDetail", {
            time: formatTime(paidAtMs, lang),
          })}
          action={{ label: t("paymentNew"), onPress: toTerminal }}
          onDismiss={toTerminal}
        />
      ) : null}
    </Screen>
  );
}
