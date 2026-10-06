import {
  AmountDisplay,
  Button,
  Card,
  ListRow,
  Notice,
  Screen,
  Section,
  Stack,
  Text,
  TextField,
} from "@platitprosim/ui";
import type { IconName } from "@platitprosim/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import type { SiteCopy } from "../../copy";
import { useSite } from "../../site/site";
import { DemoScreen, DemoSheet } from "../chrome";
import {
  formatDateTime,
  methodIcons,
  methodLabel,
  npubIn,
  parseSats,
} from "../labels";
import { formatCrowns, formatNumber, satsToHalere } from "../money";
import { useDemo } from "../store";
import type { DemoPayment, DemoWithdrawal, WithdrawalKind } from "../store";

const demoTargets: Record<WithdrawalKind, string> = {
  lightning: "kavarna@example.com",
  linky: "npub1demo0platitprosim0owner0linky0profile",
};

const payoutIcons: Record<WithdrawalKind, IconName> = {
  lightning: "Zap",
  linky: "Send",
};

const isTarget = (kind: WithdrawalKind, text: string) =>
  kind === "lightning"
    ? text.includes("@") || text.trim().toLowerCase().startsWith("lnbc")
    : npubIn(text) !== undefined;

function PayoutSheet({
  kind,
  onClose,
}: {
  kind: WithdrawalKind;
  onClose: () => void;
}) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { balanceSats, withdraw } = useDemo();
  const [target, setTarget] = useState(demoTargets[kind]);
  const [amountText, setAmountText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState<number>();
  const amount = parseSats(amountText);
  const available = formatNumber(balanceSats, locale);
  const amountError =
    amount === undefined
      ? t.amountInvalid
      : amount > balanceSats
        ? t.insufficient
        : undefined;
  const lightning = kind === "lightning";

  const send = () => {
    setSubmitted(true);
    if (!isTarget(kind, target) || amount === undefined || amountError) return;
    withdraw(kind, amount);
    setSent(amount);
  };

  return (
    <DemoSheet
      open
      onClose={onClose}
      title={lightning ? t.withdraw : t.sendToLinky}
    >
      <Stack gap="$lg" paddingTop="$sm">
        {sent !== undefined ? (
          <>
            <Notice
              tone="success"
              title={lightning ? t.withdrawPaid : t.linkySent}
              description={(lightning
                ? t.withdrawPaidDetail
                : t.linkySentDetail)(formatNumber(sent, locale))}
            />
            <Button size="lg" onPress={onClose}>
              {t.done}
            </Button>
          </>
        ) : (
          <>
            <TextField
              label={lightning ? t.withdrawTarget : t.linkyProfile}
              placeholder={lightning ? t.withdrawTargetPlaceholder : "npub1…"}
              hint={lightning ? undefined : t.linkyProfileHint}
              value={target}
              onChangeText={setTarget}
              error={
                submitted && !isTarget(kind, target)
                  ? lightning
                    ? t.withdrawTargetInvalid
                    : t.linkyProfileInvalid
                  : undefined
              }
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
            />
            <TextField
              label={t.amount}
              value={amountText}
              onChangeText={setAmountText}
              inputMode="numeric"
              trailing={t.sat}
              hint={
                amount === undefined
                  ? t.available(available)
                  : t.amountHint(
                      formatCrowns(satsToHalere(amount), locale),
                      available,
                    )
              }
              error={submitted ? amountError : undefined}
            />
            <Button size="lg" icon={payoutIcons[kind]} onPress={send}>
              {t.send}
            </Button>
          </>
        )}
      </Stack>
    </DemoSheet>
  );
}

interface Activity {
  id: string;
  at: Date;
  icon: IconName;
  title: string;
  label: string;
}

/** Paid Bitcoin payments and withdrawals, newest first, like the app's wallet activity. */
const walletActivity = (
  payments: readonly DemoPayment[],
  withdrawals: readonly DemoWithdrawal[],
  copy: SiteCopy,
  format: (sats: number) => string,
): Activity[] =>
  [
    ...payments.flatMap((payment): Activity[] =>
      payment.status === "paid" && payment.sats !== undefined
        ? [
            {
              id: payment.id,
              at: payment.paidAt ?? payment.at,
              icon: methodIcons[payment.method],
              title: copy.demo.activityIn(format(payment.sats)),
              label: methodLabel(payment.method, copy),
            },
          ]
        : [],
    ),
    ...withdrawals.map(
      (withdrawal): Activity => ({
        id: withdrawal.id,
        at: withdrawal.at,
        icon: payoutIcons[withdrawal.kind],
        title: copy.demo.activityOut(format(withdrawal.sats)),
        label:
          withdrawal.kind === "lightning"
            ? copy.demo.withdrawalLightning
            : copy.demo.withdrawalLinky,
      }),
    ),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 30);

/** The owner's wallet, like the app's: the balance, the two ways out and the activity. */
export function WalletMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { balanceSats, payments, withdrawals } = useDemo();
  const [payout, setPayout] = useState<WithdrawalKind>();
  const activity = walletActivity(payments, withdrawals, copy, (sats) =>
    formatNumber(sats, locale),
  );
  return (
    <DemoScreen
      tabBar={tabBar}
      overlay={
        payout ? (
          <PayoutSheet
            key={payout}
            kind={payout}
            onClose={() => setPayout(undefined)}
          />
        ) : null
      }
    >
      <Screen width="narrow">
        <Text variant="heading" role="heading">
          {t.tabs.wallet}
        </Text>
        <Card alignItems="center" gap="$lg" paddingVertical="$xxl">
          <Text variant="label" muted>
            {t.balance}
          </Text>
          <AmountDisplay
            value={formatNumber(balanceSats, locale)}
            unit={t.sat}
            secondary={t.balanceCzk(
              formatCrowns(satsToHalere(balanceSats), locale),
            )}
            placeholder={balanceSats === 0}
          />
        </Card>
        <Stack gap="$sm">
          <Button
            size="lg"
            icon="Zap"
            disabled={balanceSats === 0}
            onPress={() => setPayout("lightning")}
          >
            {t.withdraw}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            icon="Send"
            disabled={balanceSats === 0}
            onPress={() => setPayout("linky")}
          >
            {t.sendToLinky}
          </Button>
        </Stack>
        <Section title={t.activity}>
          <Card paddingVertical="$sm" gap="$none">
            {activity.map((item) => (
              <ListRow
                key={item.id}
                icon={item.icon}
                title={item.title}
                description={`${formatDateTime(item.at, locale)} · ${item.label}`}
                chevron={false}
              />
            ))}
          </Card>
        </Section>
      </Screen>
    </DemoScreen>
  );
}
