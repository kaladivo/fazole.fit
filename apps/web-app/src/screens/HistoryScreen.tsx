import {
  AmountDisplay,
  Button,
  Card,
  EmptyState,
  ListRow,
  Row,
  Screen,
  Section,
  Sheet,
  Stack,
  StatusBadge,
  Text,
} from "@platitprosim/ui";
import { useState } from "react";
import { groupByDay, relativeDay } from "../history/history";
import { useI18n } from "../i18n";
import type { Translate } from "../i18n";
import {
  formatCzkValue,
  formatDate,
  formatDateTime,
  formatTime,
} from "../i18n/format";
import { navigateTo, paymentRoute } from "../routing";
import { useIdentity, usePayments } from "../storage";
import type { Payment, ShopProfile } from "../storage";
import { DetailRows } from "./DetailRows";
import { methodIcons, methodLabels, statusLabels } from "./paymentLabels";

export function HistoryScreen({ profile }: { profile: ShopProfile }) {
  const { lang, t } = useI18n();
  const payments = usePayments();
  const { keys } = useIdentity();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = payments.find((payment) => payment.id === selectedId);
  // Employees' payments arrive with the next slice; until then every other creator is the shop.
  const creatorOf = (payment: Payment) =>
    payment.createdBy === keys.nostr.pubkey ? t("historyMe") : profile.name;
  const czk = (amount: Payment["amountCzk"]) =>
    t("amountCzk", { amount: formatCzkValue(amount, lang) });
  const [now] = useState(() => Date.now());

  return (
    <Screen testID="history-screen">
      <Text variant="heading" role="heading">
        {t("sectionHistory")}
      </Text>
      {payments.length === 0 ? (
        <EmptyState
          icon="History"
          title={t("historyEmptyTitle")}
          description={t("historyEmptyDescription")}
        />
      ) : (
        groupByDay(payments).map((day) => (
          <Section
            key={day.startMs}
            title={dayTitle(day.startMs, now, t, lang)}
            trailing={
              <Text variant="label" muted fontVariant={["tabular-nums"]}>
                {t("historyDayTotal", { amount: czk(day.paidTotal) })}
              </Text>
            }
          >
            <Card paddingVertical="$sm" gap="$none">
              {day.payments.map((payment) => (
                <ListRow
                  key={payment.id}
                  testID={`payment-row-${payment.id}`}
                  icon={methodIcons[payment.method]}
                  title={czk(payment.amountCzk)}
                  description={t("historyRow", {
                    time: formatTime(payment.createdAtMs, lang),
                    creator: creatorOf(payment),
                  })}
                  trailing={
                    <StatusBadge
                      status={payment.status}
                      label={t(statusLabels[payment.status])}
                    />
                  }
                  chevron={false}
                  onPress={() => setSelectedId(payment.id)}
                />
              ))}
            </Card>
          </Section>
        ))
      )}
      <Sheet
        open={selected !== undefined}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title={t("historyDetail")}
      >
        {selected ? (
          <Stack gap="$lg" paddingTop="$sm">
            <Stack alignItems="center" gap="$sm">
              <AmountDisplay
                value={formatCzkValue(selected.amountCzk, lang)}
                unit={t("currencyCzk")}
                size="md"
              />
              <Row justifyContent="center">
                <StatusBadge
                  status={selected.status}
                  label={t(statusLabels[selected.status])}
                />
              </Row>
            </Stack>
            <DetailRows
              details={[
                {
                  label: t("paymentMethod"),
                  value: t(methodLabels[selected.method]),
                },
                ...(selected.vs
                  ? [{ label: t("paymentVs"), value: selected.vs }]
                  : []),
                {
                  label: t("historyCreated"),
                  value: formatDateTime(selected.createdAtMs, lang),
                },
                ...(selected.paidAtMs
                  ? [
                      {
                        label: t("historyPaidAt"),
                        value: formatDateTime(selected.paidAtMs, lang),
                      },
                    ]
                  : []),
                { label: t("historyCreatedBy"), value: creatorOf(selected) },
              ]}
            />
            {selected.status === "pending" && selected.method === "bank" ? (
              <Button
                testID="history-show-qr"
                size="lg"
                icon="QrCode"
                onPress={() => navigateTo(paymentRoute(selected.id))}
              >
                {t("historyShowQr")}
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const dayTitle = (
  startMs: number,
  now: number,
  t: Translate,
  lang: Parameters<typeof formatDate>[1],
) => {
  const relative = relativeDay(startMs, now);
  return relative === "today"
    ? t("historyToday")
    : relative === "yesterday"
      ? t("historyYesterday")
      : formatDate(startMs, lang);
};
