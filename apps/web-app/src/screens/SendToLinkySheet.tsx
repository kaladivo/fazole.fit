import { parsePubkeyInput } from "@platitprosim/core";
import {
  Button,
  IconButton,
  Notice,
  QRScanner,
  Sheet,
  Stack,
  TextField,
} from "@platitprosim/ui";
import { useState } from "react";
import { useI18n } from "../i18n";
import { formatWhole } from "../i18n/format";
import { useAppServices } from "../services";
import type { WithdrawFailure } from "../services";
import { parseSats } from "../wallet/activity";
import { failureMessages, useAmountHint } from "./walletForms";

/** Sends a token to a Linky user as a chat message, from a typed or scanned profile. */
export function SendToLinkySheet({
  open,
  onOpenChange,
  balance,
  czkPerBtc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  czkPerBtc: number | null;
}) {
  const { lang, t } = useI18n();
  const { withdrawals } = useAppServices();
  const [recipientText, setRecipientText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<WithdrawFailure | null>(null);
  const [sentSats, setSentSats] = useState<number | null>(null);

  const recipient = parsePubkeyInput(recipientText);
  const amount = parseSats(amountText);
  const amountHint = useAmountHint(amount, balance, czkPerBtc);

  const close = () => {
    onOpenChange(false);
    setRecipientText("");
    setAmountText("");
    setScanning(false);
    setSubmitted(false);
    setFailure(null);
    setSentSats(null);
  };

  const send = async () => {
    setSubmitted(true);
    if (recipient === null || amount === null) return;
    setBusy(true);
    setFailure(null);
    try {
      const failed = await withdrawals.sendToLinky(recipient, amount);
      if (failed) setFailure(failed);
      else setSentSats(amount);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={t("walletSendToLinky")}
    >
      <Stack gap="$lg" paddingTop="$sm" testID="send-to-linky-sheet">
        {sentSats !== null ? (
          <>
            <Notice
              tone="success"
              title={t("linkySent")}
              description={t("linkySentDetail", {
                sats: formatWhole(sentSats, lang),
              })}
            />
            <Button testID="send-to-linky-done" size="lg" onPress={close}>
              {t("done")}
            </Button>
          </>
        ) : (
          <>
            {failure ? (
              <Notice tone="danger" title={t(failureMessages[failure])} />
            ) : null}
            {scanning ? (
              <QRScanner
                accessibilityLabel={t("linkyScanner")}
                hint={t("linkyScannerHint")}
                unavailableHint={t("linkyScannerUnavailable")}
                onScan={(text) => {
                  if (parsePubkeyInput(text) === null) return;
                  setRecipientText(text);
                  setScanning(false);
                }}
              />
            ) : null}
            <TextField
              testID="send-to-linky-recipient"
              label={t("linkyRecipient")}
              placeholder="npub1…"
              hint={t("linkyRecipientHint")}
              value={recipientText}
              onChangeText={setRecipientText}
              error={
                submitted && recipient === null
                  ? t("linkyRecipientInvalid")
                  : undefined
              }
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
              trailing={
                <IconButton
                  icon={scanning ? "X" : "ScanLine"}
                  size="sm"
                  accessibilityLabel={scanning ? t("close") : t("linkyScan")}
                  onPress={() => setScanning((current) => !current)}
                />
              }
            />
            <TextField
              testID="send-to-linky-amount"
              label={t("amount")}
              value={amountText}
              onChangeText={setAmountText}
              inputMode="numeric"
              trailing={t("currencySats")}
              hint={amountHint}
              error={
                submitted && amount === null
                  ? t("withdrawAmountInvalid")
                  : undefined
              }
            />
            <Button
              testID="send-to-linky-submit"
              size="lg"
              icon="Send"
              loading={busy}
              onPress={() => void send()}
            >
              {t("withdrawSubmit")}
            </Button>
          </>
        )}
      </Stack>
    </Sheet>
  );
}
