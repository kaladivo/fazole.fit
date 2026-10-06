import {
  AmountDisplay,
  Button,
  Card,
  IconButton,
  Pill,
  QRCode,
  Row,
  Screen,
  SegmentedControl,
  Stack,
  SuccessOverlay,
  Text,
  TopBar,
} from "@platitprosim/ui";
import { useEffect, useState } from "react";
import { useSite } from "../../site/site";
import { DemoScreen, DetailRows } from "../chrome";
import { czk, formatTime, methodLabel } from "../labels";
import {
  demoCzkPerBtc,
  formatCrowns,
  formatNumber,
  halereToSats,
} from "../money";
import { demoAccount, demoBip321, demoSpd } from "../qr";
import { useDemo } from "../store";
import type { DemoPayment } from "../store";

type Leg = "bank" | "bitcoin";

/** How long the demo waits before a Bitcoin payment "arrives". */
const bitcoinArrivesAfterMs = 4500;

function DemoDataPill() {
  const t = useSite().copy.demo;
  return <Pill label={t.demoData} tone="warning" icon="TriangleAlert" />;
}

function BankLeg({ payment }: { payment: DemoPayment }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  return (
    <>
      <Stack alignItems="center" gap="$lg">
        <QRCode
          size="lg"
          logo="Landmark"
          accessibilityLabel={t.bankQr(czk(payment.halere, copy, locale))}
          value={demoSpd(payment.halere, payment.variableSymbol ?? "")}
        />
        <AmountDisplay
          value={formatCrowns(payment.halere, locale)}
          unit={t.currency}
          size="md"
        />
        <Row justifyContent="center">
          <DemoDataPill />
        </Row>
      </Stack>
      <Card gap="$sm" paddingVertical="$lg">
        <DetailRows
          details={[
            ...(payment.variableSymbol
              ? [{ label: t.variableSymbol, value: payment.variableSymbol }]
              : []),
            { label: t.account, value: demoAccount.display },
            { label: t.recipient, value: t.shopName },
          ]}
        />
      </Card>
    </>
  );
}

function BitcoinLeg({ payment }: { payment: DemoPayment }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const sats = t.amountSats(formatNumber(halereToSats(payment.halere), locale));
  return (
    <>
      <Stack alignItems="center" gap="$lg">
        {/* No logo, like the app: its dense payload needs the lowest error correction. */}
        <QRCode
          size="lg"
          accessibilityLabel={t.bitcoinQr(czk(payment.halere, copy, locale))}
          value={demoBip321(halereToSats(payment.halere))}
        />
        <AmountDisplay
          value={formatCrowns(payment.halere, locale)}
          unit={t.currency}
          secondary={sats}
          size="md"
        />
        <Row justifyContent="center" gap="$sm" flexWrap="wrap">
          {payment.status === "pending" ? (
            <Pill label={t.waiting} tone="accent" busy />
          ) : null}
          <DemoDataPill />
        </Row>
      </Stack>
      <Card gap="$sm" paddingVertical="$lg">
        <DetailRows
          details={[
            { label: t.inBitcoin, value: sats },
            {
              label: t.rate,
              value: t.rateValue(formatNumber(demoCzkPerBtc, locale)),
            },
            { label: t.recipient, value: t.shopName },
          ]}
        />
        <Text variant="caption" muted>
          {t.bitcoinHint}
        </Text>
        <Text variant="caption" muted>
          {t.autoPay}
        </Text>
      </Card>
    </>
  );
}

/** The customer-facing payment, like the app's: a bank QR, or a Bitcoin QR that the demo pays by itself. */
export function PaymentMock({
  paymentId,
  onDone,
}: {
  paymentId: string;
  onDone: () => void;
}) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { payments, settlePayment } = useDemo();
  const payment = payments.find(({ id }) => id === paymentId);
  const [leg, setLeg] = useState<Leg>("bank");
  const pending = payment?.status === "pending";
  const sats = halereToSats(payment?.halere ?? 0);

  useEffect(() => {
    if (leg !== "bitcoin" || !pending) return;
    const timer = setTimeout(
      () =>
        settlePayment(paymentId, { status: "paid", method: "lightning", sats }),
      bitcoinArrivesAfterMs,
    );
    return () => clearTimeout(timer);
  }, [leg, pending, paymentId, sats, settlePayment]);

  if (!payment) return null;
  return (
    <DemoScreen
      overlay={
        payment.status === "paid" ? (
          <SuccessOverlay
            contained
            title={t.paid}
            amount={formatCrowns(payment.halere, locale)}
            unit={t.currency}
            detail={`${methodLabel(payment.method, copy)} · ${formatTime(payment.paidAt ?? payment.at, locale)}`}
            action={{ label: t.newPayment, onPress: onDone }}
            onDismiss={onDone}
          />
        ) : null
      }
    >
      <TopBar
        title={t.payment}
        leading={
          <IconButton icon="X" accessibilityLabel={t.close} onPress={onDone} />
        }
      />
      <Screen width="narrow">
        <SegmentedControl
          accessibilityLabel={t.method}
          size="lg"
          value={leg}
          onValueChange={setLeg}
          options={[
            { value: "bank", label: t.bank, icon: "Landmark" },
            { value: "bitcoin", label: t.bitcoin, icon: "Bitcoin" },
          ]}
        />
        {leg === "bank" ? (
          <BankLeg payment={payment} />
        ) : (
          <BitcoinLeg payment={payment} />
        )}
        {pending ? (
          <Stack gap="$sm">
            {leg === "bank" ? (
              <Button
                size="lg"
                icon="Check"
                onPress={() =>
                  settlePayment(paymentId, { status: "paid", method: "bank" })
                }
              >
                {t.markPaid}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onPress={() => {
                settlePayment(paymentId, { status: "cancelled" });
                onDone();
              }}
            >
              {t.cancelPayment}
            </Button>
          </Stack>
        ) : null}
      </Screen>
    </DemoScreen>
  );
}
