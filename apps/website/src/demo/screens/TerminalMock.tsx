import {
  AmountDisplay,
  Avatar,
  Button,
  IconButton,
  Keypad,
  Pill,
  QRCode,
  Row,
  SegmentedControl,
  Spinner,
  Stack,
  SuccessOverlay,
  Text,
  TopBar,
} from "@platitprosim/ui";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSite } from "../../site/site";
import { DemoBody, DemoScreen } from "../chrome";
import { useDemo } from "../store";
import type { PaymentMethod } from "../store";
import {
  decimalSymbol,
  demoCzkPerBtc,
  formatCrowns,
  formatNumber,
  formatTyped,
  halereToSats,
  pressKey,
  typedHalere,
} from "../money";
import { demoAccount, demoBip321, demoSpd, randomVariableSymbol } from "../qr";

type Method = "bank" | "bitcoin";

interface Request {
  halere: number;
  variableSymbol: string;
}

/** How long the demo waits before a Bitcoin payment "arrives". */
const bitcoinArrivesAfterMs = 4500;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Row justifyContent="space-between">
      <Text variant="label" muted>
        {label}
      </Text>
      <Text variant="label" mono color="$colorStrong">
        {value}
      </Text>
    </Row>
  );
}

function PaymentScreen({
  request,
  onDone,
}: {
  request: Request;
  onDone: () => void;
}) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { addPayment } = useDemo();
  const [method, setMethod] = useState<Method>("bank");
  const [paidWith, setPaidWith] = useState<PaymentMethod>();
  const sats = halereToSats(request.halere);
  /** Records the payment in the shared demo history and leaves for the keypad. */
  const close = () => {
    const recorded = paidWith ?? (method === "bank" ? "bank" : "lightning");
    addPayment({
      halere: request.halere,
      method: recorded,
      status: paidWith ? "paid" : "cancelled",
      ...(recorded === "bank" ? {} : { sats }),
    });
    onDone();
  };

  useEffect(() => {
    if (method !== "bitcoin" || paidWith) return;
    const timer = setTimeout(
      () => setPaidWith("lightning"),
      bitcoinArrivesAfterMs,
    );
    return () => clearTimeout(timer);
  }, [method, paidWith]);

  return (
    <DemoScreen>
      <TopBar
        title={t.payment}
        subtitle={t.shopName}
        leading={
          <IconButton
            icon="X"
            size="sm"
            accessibilityLabel={t.cancel}
            onPress={close}
          />
        }
      />
      <DemoBody gap="$lg">
        <AmountDisplay
          value={formatCrowns(request.halere, locale)}
          unit={t.currency}
          size="md"
          secondary={`${formatNumber(sats, locale)} ${t.sat}`}
        />
        <SegmentedControl
          accessibilityLabel={t.method}
          size="lg"
          value={method}
          onValueChange={setMethod}
          options={[
            { value: "bank", label: t.bank, icon: "Landmark" },
            { value: "bitcoin", label: t.bitcoin, icon: "Bitcoin" },
          ]}
        />
        {method === "bank" ? (
          <QRCode
            value={demoSpd(request.halere, request.variableSymbol)}
            accessibilityLabel={t.bankQr}
            logo="Landmark"
          />
        ) : (
          <QRCode
            value={demoBip321(sats)}
            accessibilityLabel={t.bitcoinQr}
            logo="brand"
          />
        )}
        <Row justifyContent="center">
          <Pill label={t.demoData} tone="warning" icon="TriangleAlert" />
        </Row>
        {method === "bank" ? (
          <>
            <Stack gap="$xs">
              <DetailRow label={t.account} value={demoAccount.display} />
              <DetailRow
                label={t.variableSymbol}
                value={request.variableSymbol}
              />
            </Stack>
            <Button size="lg" icon="Check" onPress={() => setPaidWith("bank")}>
              {t.markPaid}
            </Button>
          </>
        ) : (
          <Stack gap="$xs" alignItems="center">
            <Row gap="$sm">
              <Spinner />
              <Text variant="label" color="$colorStrong">
                {t.waiting}
              </Text>
            </Row>
            <Text variant="caption" muted textAlign="center">
              {t.rate(formatNumber(demoCzkPerBtc, locale))}
            </Text>
            <Text variant="caption" muted textAlign="center">
              {t.autoPay}
            </Text>
          </Stack>
        )}
      </DemoBody>
      {paidWith ? (
        <SuccessOverlay
          contained
          title={t.paid}
          amount={formatCrowns(request.halere, locale)}
          unit={t.currency}
          detail={
            paidWith === "bank"
              ? t.bankDetail(request.variableSymbol)
              : t.bitcoinDetail(formatNumber(sats, locale))
          }
          action={{ label: t.newPayment, onPress: close }}
          onDismiss={close}
        />
      ) : null}
    </DemoScreen>
  );
}

/** The terminal: type an amount, request it, take the payment. */
export function TerminalMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const [input, setInput] = useState("");
  const [request, setRequest] = useState<Request>();
  const halere = typedHalere(input);

  if (request) {
    return (
      <PaymentScreen
        request={request}
        onDone={() => {
          setRequest(undefined);
          setInput("");
        }}
      />
    );
  }
  return (
    <DemoScreen tabBar={tabBar}>
      <TopBar
        title={t.shopName}
        subtitle={t.tabs.terminal}
        leading={<Avatar name={t.shopName} icon="Store" size="sm" />}
      />
      <DemoBody gap="$xl">
        <Stack flex={1} justifyContent="center">
          <AmountDisplay
            value={formatTyped(input, locale)}
            unit={t.currency}
            placeholder={input === ""}
            secondary={
              halere > 0
                ? `${formatNumber(halereToSats(halere), locale)} ${t.sat}`
                : " "
            }
            live
          />
        </Stack>
        <Keypad
          accessibilityLabel={t.amount}
          labels={{ decimal: t.decimal, backspace: t.backspace }}
          decimalSymbol={decimalSymbol(locale)}
          onKeyPress={(key) => setInput((current) => pressKey(current, key))}
        />
        <Button
          size="lg"
          icon="QrCode"
          disabled={halere === 0}
          onPress={() =>
            setRequest({ halere, variableSymbol: randomVariableSymbol() })
          }
        >
          {t.requestPayment}
        </Button>
      </DemoBody>
    </DemoScreen>
  );
}
