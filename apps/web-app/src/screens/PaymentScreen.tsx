import { buildBitcoinPaymentUri, buildSpd } from "@platitprosim/core";
import {
  AmountDisplay,
  Button,
  Card,
  EmptyState,
  IconButton,
  Notice,
  Pill,
  QRCode,
  Row,
  Screen,
  SegmentedControl,
  Spinner,
  Stack,
  StatusBadge,
  SuccessOverlay,
  Text,
  TopBar,
} from "@platitprosim/ui";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { formatCzkValue, formatTime, formatWhole } from "../i18n/format";
import { navigateTo } from "../routing";
import { useAppServices } from "../services";
import type { BitcoinRequestFailure } from "../services";
import {
  bitcoinRequestOf,
  cancelPayment,
  completePayment,
  useAppEvolu,
  usePayment,
  useReceipts,
} from "../storage";
import type { Payment, ShopProfile } from "../storage";
import { paidAgainReceipts } from "../wallet/activity";
import { DetailRows } from "./DetailRows";
import { methodLabels, statusLabels } from "./paymentLabels";

const toTerminal = () => navigateTo("terminal");

const PAID_DISMISS_MS = 3_000;

type Leg = "bank" | "bitcoin";

/** The customer-facing payment: an SPD QR for the bank, a BIP-321 QR for Lightning and Cashu. */
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
        <OpenPayment payment={payment} profile={profile} />
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

function OpenPayment({
  payment,
  profile,
}: {
  payment: Payment;
  profile: ShopProfile;
}) {
  const { lang, t } = useI18n();
  const evolu = useAppEvolu();
  // A payment reopened with a Bitcoin leg, e.g. after a reload, shows that leg again.
  const [leg, setLeg] = useState<Leg>(() =>
    bitcoinRequestOf(payment) ? "bitcoin" : "bank",
  );
  // The overlay celebrates a payment that settles while it is on screen.
  const [openedPaid] = useState(payment.status === "paid");
  const amount = formatCzkValue(payment.amountCzk, lang);
  const open = payment.status === "pending";
  const paidAgain = paidAgainReceipts(payment, useReceipts());
  const celebrating = payment.status === "paid" && !openedPaid;
  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(toTerminal, PAID_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [celebrating]);

  const cancel = async () => {
    await cancelPayment(evolu, payment);
    toTerminal();
  };

  return (
    <Screen width="narrow" testID="payment-screen">
      {open ? (
        <>
          <SegmentedControl
            accessibilityLabel={t("paymentMethod")}
            size="lg"
            value={leg}
            onValueChange={setLeg}
            options={[
              { value: "bank", label: t("methodBank"), icon: "Landmark" },
              { value: "bitcoin", label: t("methodBitcoin"), icon: "Bitcoin" },
            ]}
          />
          {leg === "bank" ? (
            <BankLeg payment={payment} profile={profile} />
          ) : (
            <BitcoinLeg payment={payment} profile={profile} />
          )}
        </>
      ) : null}
      {open ? (
        <Stack gap="$sm">
          {leg === "bank" ? (
            <Button
              testID="payment-mark-paid"
              size="lg"
              icon="Check"
              onPress={() => void completePayment(evolu, payment, "bank")}
            >
              {t("paymentMarkPaid")}
            </Button>
          ) : null}
          <Button
            testID="payment-cancel"
            variant="ghost"
            onPress={() => void cancel()}
          >
            {t("paymentCancel")}
          </Button>
        </Stack>
      ) : !celebrating ? (
        <Stack gap="$md">
          <StatusBadge
            status={payment.status}
            label={t(statusLabels[payment.status])}
          />
          {paidAgain.map((receipt) => (
            <Notice
              key={receipt.id}
              tone="warning"
              title={t("paymentPaidTwice")}
              description={t("paymentPaidTwiceDetail", {
                sats: formatWhole(receipt.sats, lang),
                method: t(
                  receipt.kind === "lightning"
                    ? "methodLightning"
                    : "methodCashu",
                ),
              })}
            />
          ))}
          <Notice title={t("paymentClosed")} />
          <Button variant="secondary" onPress={toTerminal}>
            {t("backToTerminal")}
          </Button>
        </Stack>
      ) : (
        <SuccessOverlay
          title={t("paymentPaidTitle")}
          amount={amount}
          unit={t("currencyCzk")}
          detail={t("paymentPaidDetail", {
            method: t(methodLabels[payment.method]),
            time: formatTime(payment.paidAtMs ?? payment.updatedAtMs, lang),
          })}
          action={{ label: t("paymentNew"), onPress: toTerminal }}
          onDismiss={toTerminal}
        />
      )}
    </Screen>
  );
}

function BankLeg({
  payment,
  profile,
}: {
  payment: Payment;
  profile: ShopProfile;
}) {
  const { lang, t } = useI18n();
  const amount = formatCzkValue(payment.amountCzk, lang);
  return (
    <>
      <Stack alignItems="center" gap="$lg">
        <QRCode
          testID="payment-qr"
          size="lg"
          logo="Landmark"
          accessibilityLabel={t("paymentBankQr", {
            amount: t("amountCzk", { amount }),
          })}
          tooltip={t("paymentEnlarge")}
          enlarge={{ closeLabel: t("close") }}
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
    </>
  );
}

const COPIED_MS = 2_000;

const failureTitles = {
  "rate-unavailable": "bitcoinRateUnavailable",
  "mint-unreachable": "bitcoinMintUnreachable",
} as const satisfies Record<
  Exclude<BitcoinRequestFailure["reason"], "below-minimum">,
  string
>;

/** Asks for the payment's Bitcoin leg while it is pending and has none, e.g. after its quote expired. */
const useBitcoinRequest = (payment: Payment, profile: ShopProfile) => {
  const { bitcoinPayments } = useAppServices();
  const [failure, setFailure] = useState<BitcoinRequestFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef({ payment, profile });
  useEffect(() => {
    latest.current = { payment, profile };
  });
  const missing =
    payment.status === "pending" && bitcoinRequestOf(payment) === null;
  useEffect(() => {
    if (!missing) return;
    let current = true;
    void bitcoinPayments
      .request(latest.current.payment, latest.current.profile)
      .then((result) => {
        if (current) setFailure(result);
      });
    return () => {
      current = false;
    };
  }, [bitcoinPayments, missing, attempt, payment.id]);
  return {
    failure: missing ? failure : null,
    retry: () => {
      setFailure(null);
      setAttempt((count) => count + 1);
    },
  };
};

function BitcoinLeg({
  payment,
  profile,
}: {
  payment: Payment;
  profile: ShopProfile;
}) {
  const { lang, t } = useI18n();
  const { failure, retry } = useBitcoinRequest(payment, profile);
  const request = bitcoinRequestOf(payment);
  const [copied, setCopied] = useState(false);
  const [lightningOnly, setLightningOnly] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const amount = formatCzkValue(payment.amountCzk, lang);

  if (failure?.reason === "below-minimum") {
    return (
      <Notice
        title={t("bitcoinMinimum", {
          amount: t("amountCzk", {
            amount: formatCzkValue(failure.minimumCzk, lang),
          }),
        })}
        description={t("bitcoinMinimumHint")}
      />
    );
  }
  if (failure) {
    return (
      <Notice
        tone="danger"
        title={t(failureTitles[failure.reason])}
        description={t("bitcoinUnavailableHint")}
        action={{ label: t("retry"), onPress: retry }}
      />
    );
  }
  if (request === null) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        gap="$md"
        minHeight="$hero"
        testID="payment-bitcoin-preparing"
      >
        <Spinner size="lg" />
        <Text muted>{t("paymentPreparing")}</Text>
      </Stack>
    );
  }
  const sats = formatWhole(request.sats, lang);
  const uri = buildBitcoinPaymentUri(request.invoice, request.paymentRequest);
  const copy = async () => {
    await navigator.clipboard.writeText(lightningOnly ? request.invoice : uri);
    setCopied(true);
  };
  const status = copied ? (
    <Pill label={t("paymentCopied")} tone="success" icon="Check" />
  ) : payment.status === "pending" ? (
    <Pill label={t("paymentWaiting")} tone="accent" busy />
  ) : null;
  return (
    <>
      {/* No logo: a logo needs the highest error correction, and this payload is already dense. */}
      <QRCode
        testID="payment-bitcoin-qr"
        size="lg"
        accessibilityLabel={t("paymentBitcoinQr", {
          amount: t("amountCzk", { amount }),
        })}
        tooltip={t("paymentEnlarge")}
        enlarge={{ closeLabel: t("close") }}
        // Uppercase fits QR's alphanumeric mode, a much coarser code for weak cameras.
        value={lightningOnly ? request.invoice.toUpperCase() : uri}
      />
      <SegmentedControl
        accessibilityLabel={t("paymentQrKind")}
        value={lightningOnly ? "lightning" : "combined"}
        onValueChange={(kind) => setLightningOnly(kind === "lightning")}
        options={[
          { value: "combined", label: t("paymentQrCombined") },
          { value: "lightning", label: t("paymentQrLightning") },
        ]}
      />
      <Stack alignItems="center" gap="$lg">
        <AmountDisplay
          testID="payment-bitcoin-amount"
          value={amount}
          unit={t("currencyCzk")}
          secondary={t("amountSats", { sats })}
          size="md"
        />
        <Row
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          gap="$sm"
        >
          {status}
          <Button
            testID="payment-copy"
            size="sm"
            variant="ghost"
            icon="Copy"
            onPress={() => void copy()}
          >
            {t("paymentCopyLink")}
          </Button>
        </Row>
      </Stack>
      <Card gap="$sm" paddingVertical="$lg">
        <DetailRows
          details={[
            { label: t("paymentSats"), value: t("amountSats", { sats }) },
            {
              label: t("paymentRate"),
              value: t("paymentRateValue", {
                rate: formatWhole(request.czkPerBtc, lang),
              }),
            },
            { label: t("paymentRecipient"), value: profile.name },
          ]}
        />
        <Text variant="caption" muted>
          {t("paymentBitcoinHint")}
        </Text>
      </Card>
    </>
  );
}
