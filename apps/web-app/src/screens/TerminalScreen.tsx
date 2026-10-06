import { useState } from "react";
import { AmountDisplay, Button, Keypad, Screen, Stack } from "@platitprosim/ui";
import { useI18n } from "../i18n";
import { applyAmountKey, formatAmount } from "./amountInput";

export function TerminalScreen() {
  const { t } = useI18n();
  const [amount, setAmount] = useState("");
  return (
    <Screen width="narrow" scroll={false} testID="terminal-screen">
      <Stack flex={1} justifyContent="center" minHeight="$hero">
        <AmountDisplay
          testID="terminal-amount"
          value={formatAmount(amount)}
          unit={t("currencyCzk")}
          placeholder={amount === ""}
          live
        />
      </Stack>
      <Keypad
        accessibilityLabel={t("amount")}
        labels={{
          decimal: t("keypadDecimal"),
          backspace: t("keypadBackspace"),
        }}
        onKeyPress={(key) =>
          setAmount((current) => applyAmountKey(current, key))
        }
      />
      <Button size="lg" icon="QrCode" disabled={amount === ""}>
        {t("requestPayment")}
      </Button>
    </Screen>
  );
}
