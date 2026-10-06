import {
  AmountDisplay,
  Button,
  Card,
  IconButton,
  ListRow,
  Section,
  Stack,
  SuccessOverlay,
  Text,
  TextField,
  TopBar,
} from "@platitprosim/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import { useSite } from "../../site/site";
import { DemoBody, DemoScreen } from "../chrome";
import { useDemo } from "../store";
import { creatorName, formatTime, methodIcons } from "../labels";
import { formatCzk, formatNumber, satsToHalere } from "../money";

type Payout = "lightning" | "linky";

const demoDestinations: Record<Payout, string> = {
  lightning: "kavarna@example.com",
  linky: "npub1demo0platitprosim0owner0linky0profile",
};

function PayoutScreen({
  payout,
  onDone,
}: {
  payout: Payout;
  onDone: () => void;
}) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { balanceSats, spend } = useDemo();
  const [destination, setDestination] = useState(demoDestinations[payout]);
  const [sent, setSent] = useState<number>();
  return (
    <DemoScreen>
      <TopBar
        title={payout === "lightning" ? t.withdraw : t.sendToLinky}
        leading={
          <IconButton
            icon="ArrowLeft"
            size="sm"
            accessibilityLabel={t.cancel}
            onPress={onDone}
          />
        }
      />
      <DemoBody gap="$xl">
        <TextField
          label={payout === "lightning" ? t.lightningAddress : t.linkyProfile}
          value={destination}
          onChangeText={setDestination}
          autoCapitalize="none"
        />
        <Stack paddingVertical="$xl">
          <AmountDisplay
            value={formatNumber(balanceSats, locale)}
            unit={t.sat}
            secondary={formatCzk(satsToHalere(balanceSats), locale)}
          />
        </Stack>
        <Button
          size="lg"
          icon={payout === "lightning" ? "Zap" : "Send"}
          disabled={balanceSats === 0 || destination.trim() === ""}
          onPress={() => {
            setSent(balanceSats);
            spend(balanceSats);
          }}
        >
          {payout === "lightning" ? t.withdrawAll : t.send}
        </Button>
      </DemoBody>
      {sent === undefined ? null : (
        <SuccessOverlay
          contained
          title={t.sent}
          amount={formatNumber(sent, locale)}
          unit={t.sat}
          detail={destination}
          action={{ label: t.tabs.wallet, onPress: onDone }}
          onDismiss={onDone}
        />
      )}
    </DemoScreen>
  );
}

/** The owner's wallet: the balance, incoming Bitcoin and the ways out. */
export function WalletMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { balanceSats, payments, employees } = useDemo();
  const [payout, setPayout] = useState<Payout>();
  if (payout) {
    return <PayoutScreen payout={payout} onDone={() => setPayout(undefined)} />;
  }
  const incoming = payments.filter(
    (payment) => payment.sats !== undefined && payment.status === "paid",
  );
  return (
    <DemoScreen tabBar={tabBar}>
      <TopBar title={t.tabs.wallet} subtitle={t.shopName} />
      <DemoBody>
        <Card gap="$lg" paddingVertical="$xxl">
          <Text eyebrow textAlign="center">
            {t.balance}
          </Text>
          <AmountDisplay
            value={formatNumber(balanceSats, locale)}
            unit={t.sat}
            secondary={formatCzk(satsToHalere(balanceSats), locale)}
          />
          <Stack gap="$sm">
            <Button icon="Zap" onPress={() => setPayout("lightning")}>
              {t.withdraw}
            </Button>
            <Button
              variant="secondary"
              icon="Send"
              onPress={() => setPayout("linky")}
            >
              {t.sendToLinky}
            </Button>
          </Stack>
        </Card>
        <Section title={t.recent}>
          <Stack gap="$none">
            {incoming.map((payment) => (
              <ListRow
                key={payment.id}
                icon={methodIcons[payment.method]}
                title={`+${formatNumber(payment.sats ?? 0, locale)} ${t.sat}`}
                description={`${creatorName(payment, employees, copy)} · ${formatTime(payment.at, locale)}`}
                trailing={
                  <Text variant="caption" muted>
                    {t.received}
                  </Text>
                }
              />
            ))}
          </Stack>
        </Section>
      </DemoBody>
    </DemoScreen>
  );
}
