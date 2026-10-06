import { keypadAmount } from "@platitprosim/core";
import {
  AmountDisplay,
  Button,
  IconButton,
  Keypad,
  Screen,
  Stack,
  Text,
  useMedia,
} from "@platitprosim/ui";
import { useState } from "react";
import { useI18n } from "../i18n";
import { navigateTo, paymentRoute } from "../routing";
import { createPayment, useAppEvolu, useIdentity } from "../storage";
import type { ShopProfile } from "../storage";
import {
  canRequestPayment,
  decimalSymbol,
  formatAmountInput,
  pressAmountKey,
} from "../terminal/amountInput";

export function TerminalScreen({ profile }: { profile: ShopProfile }) {
  const { lang, t } = useI18n();
  const evolu = useAppEvolu();
  const { keys } = useIdentity();
  const [input, setInput] = useState("");
  const [requesting, setRequesting] = useState(false);
  const { wide } = useMedia();

  const request = async () => {
    setRequesting(true);
    const id = await createPayment(evolu, {
      amountCzk: keypadAmount(input),
      createdBy: keys.nostr.pubkey,
    });
    setRequesting(false);
    setInput("");
    navigateTo(paymentRoute(id));
  };

  return (
    <Screen width="narrow" scroll={false} testID="terminal-screen">
      <Text eyebrow textAlign="center" numberOfLines={1}>
        {profile.name}
      </Text>
      <Stack flex={1} justifyContent="center" minHeight="$amount">
        <AmountDisplay
          testID="terminal-amount"
          value={formatAmountInput(input, lang)}
          unit={t("currencyCzk")}
          placeholder={input === ""}
          live
        />
      </Stack>
      <Keypad
        accessibilityLabel={t("amount")}
        labels={{
          decimal: t("keypadDecimal"),
          backspace: t("keypadBackspace"),
        }}
        decimalSymbol={decimalSymbol(lang)}
        onKeyPress={(key) =>
          setInput((current) => pressAmountKey(current, key))
        }
      />
      <Button
        testID="request-payment"
        size="lg"
        icon="QrCode"
        loading={requesting}
        disabled={!canRequestPayment(input)}
        onPress={() => void request()}
      >
        {t("requestPayment")}
      </Button>
      {wide ? null : (
        <Stack alignItems="center">
          <IconButton
            testID="terminal-history"
            icon="History"
            accessibilityLabel={t("sectionHistory")}
            onPress={() => navigateTo("history")}
          />
        </Stack>
      )}
    </Screen>
  );
}
