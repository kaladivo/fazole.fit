import {
  AmountDisplay,
  Button,
  Keypad,
  Screen,
  Stack,
  Text,
} from "@platitprosim/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import { useSite } from "../../site/site";
import { DemoScreen } from "../chrome";
import { decimalSymbol, formatTyped, pressKey, typedHalere } from "../money";
import { useDemo } from "../store";
import { PaymentMock } from "./PaymentMock";

/** The terminal: type an amount, request it, take the payment. */
export function TerminalMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { requestPayment } = useDemo();
  const [input, setInput] = useState("");
  const [paymentId, setPaymentId] = useState<string>();
  const halere = typedHalere(input);

  if (paymentId) {
    return (
      <PaymentMock
        paymentId={paymentId}
        onDone={() => setPaymentId(undefined)}
      />
    );
  }
  return (
    <DemoScreen tabBar={tabBar}>
      <Screen width="narrow" scroll={false}>
        <Text eyebrow textAlign="center" numberOfLines={1}>
          {t.shopName}
        </Text>
        <Stack flex={1} justifyContent="center" minHeight="$amount">
          <AmountDisplay
            value={formatTyped(input, locale)}
            unit={t.currency}
            placeholder={input === ""}
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
          onPress={() => {
            setPaymentId(requestPayment(halere).id);
            setInput("");
          }}
        >
          {t.requestPayment}
        </Button>
      </Screen>
    </DemoScreen>
  );
}
