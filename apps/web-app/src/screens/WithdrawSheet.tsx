import { satsToCzk } from "@platitprosim/core";
import { Button, Notice, Sheet, Stack, TextField } from "@platitprosim/ui";
import { Either } from "effect";
import { useState } from "react";
import { useI18n } from "../i18n";
import { formatCzkValue, formatWhole } from "../i18n/format";
import { parseLightningTarget, useAppServices } from "../services";
import type { LightningPayout, WithdrawFailure } from "../services";
import { parseSats } from "../wallet/activity";
import { DetailRows } from "./DetailRows";
import { failureMessages, useAmountHint } from "./walletForms";

type Step =
  | { readonly kind: "form" }
  | { readonly kind: "review"; readonly payout: LightningPayout }
  | { readonly kind: "done"; readonly result: "paid" | "pending" };

/** Pays a Lightning address or invoice from the wallet: enter, review the fee, send. */
export function WithdrawSheet({
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
  const [targetText, setTargetText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<WithdrawFailure | null>(null);

  const target = parseLightningTarget(targetText);
  const amount =
    target?.kind === "invoice" ? target.amountSats : parseSats(amountText);
  const amountHint = useAmountHint(amount, balance, czkPerBtc);

  const close = () => {
    onOpenChange(false);
    setTargetText("");
    setAmountText("");
    setSubmitted(false);
    setStep({ kind: "form" });
    setFailure(null);
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setFailure(null);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  const review = () =>
    run(async () => {
      setSubmitted(true);
      if (target === null || amount === null) return;
      const quoted = await withdrawals.quoteLightning(target, amount);
      if (Either.isLeft(quoted)) setFailure(quoted.left);
      else setStep({ kind: "review", payout: quoted.right });
    });

  const pay = (payout: LightningPayout) =>
    run(async () => {
      const paid = await withdrawals.payLightning(payout);
      if (Either.isLeft(paid)) setFailure(paid.left);
      else setStep({ kind: "done", result: paid.right });
    });

  const sats = (value: number) =>
    t("amountSats", { sats: formatWhole(value, lang) });
  const withCzk = (value: number) =>
    czkPerBtc === null
      ? sats(value)
      : `${sats(value)} (${t("walletBalanceCzk", {
          amount: formatCzkValue(satsToCzk(value, czkPerBtc), lang),
        })})`;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={t("walletWithdraw")}
    >
      <Stack gap="$lg" paddingTop="$sm" testID="withdraw-sheet">
        {failure ? (
          <Notice tone="danger" title={t(failureMessages[failure])} />
        ) : null}
        {step.kind === "form" ? (
          <>
            <TextField
              testID="withdraw-target"
              label={t("withdrawTarget")}
              placeholder={t("withdrawTargetPlaceholder")}
              value={targetText}
              onChangeText={setTargetText}
              hint={
                target?.kind === "invoice"
                  ? t("withdrawInvoiceHint", {
                      sats: formatWhole(target.amountSats, lang),
                    })
                  : undefined
              }
              error={
                submitted && target === null
                  ? t("withdrawTargetInvalid")
                  : undefined
              }
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
            />
            {target?.kind === "invoice" ? null : (
              <TextField
                testID="withdraw-amount"
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
            )}
            <Button
              testID="withdraw-review"
              size="lg"
              loading={busy}
              onPress={() => void review()}
            >
              {t("continue")}
            </Button>
          </>
        ) : step.kind === "review" ? (
          <>
            <DetailRows
              details={[
                { label: t("withdrawTo"), value: shorten(step.payout.target) },
                {
                  label: t("amount"),
                  value: withCzk(step.payout.quote.amount),
                },
                {
                  label: t("withdrawFee"),
                  value: sats(step.payout.quote.feeReserve),
                },
                {
                  label: t("withdrawTotal"),
                  value: sats(
                    step.payout.quote.amount + step.payout.quote.feeReserve,
                  ),
                },
              ]}
            />
            <Stack gap="$sm">
              <Button
                testID="withdraw-submit"
                size="lg"
                icon="Zap"
                loading={busy}
                onPress={() => void pay(step.payout)}
              >
                {t("withdrawSubmit")}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onPress={() => setStep({ kind: "form" })}
              >
                {t("back")}
              </Button>
            </Stack>
          </>
        ) : (
          <>
            {step.result === "paid" ? (
              <Notice
                tone="success"
                title={t("withdrawPaid")}
                description={t("withdrawPaidDetail", {
                  sats: formatWhole(amount ?? 0, lang),
                })}
              />
            ) : (
              <Notice
                tone="warning"
                title={t("withdrawPendingTitle")}
                description={t("withdrawPendingDetail")}
              />
            )}
            <Button testID="withdraw-done" size="lg" onPress={close}>
              {t("done")}
            </Button>
          </>
        )}
      </Stack>
    </Sheet>
  );
}

/** An invoice is too long to read; its ends identify it. */
const shorten = (target: string) =>
  target.length > 32 ? `${target.slice(0, 16)}…${target.slice(-8)}` : target;
