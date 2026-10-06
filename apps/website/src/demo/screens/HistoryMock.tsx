import {
  AmountDisplay,
  Button,
  Card,
  EmptyState,
  Icon,
  ListRow,
  Row,
  Screen,
  Section,
  Stack,
  StatusBadge,
  Text,
} from "@platitprosim/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import { useSite } from "../../site/site";
import { DemoScreen, DemoSheet, DetailRows } from "../chrome";
import {
  creatorName,
  czk,
  dayTitle,
  formatDateTime,
  formatTime,
  groupByDay,
  methodIcons,
  methodLabel,
  paidTotal,
} from "../labels";
import { formatCrowns, formatNumber } from "../money";
import { ownerId, useDemo } from "../store";

const everyone = "everyone";

/** The owner's history, like the app's: payments by day, a filter by who took them and each payment's details. */
export function HistoryMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { payments, employees } = useDemo();
  const [filter, setFilter] = useState(everyone);
  const [choosing, setChoosing] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const filters = [
    { value: everyone, label: t.everyone },
    { value: ownerId, label: t.me },
    ...employees.map(({ id, name }) => ({ value: id, label: name })),
  ];
  const shown = payments.filter(
    (payment) => filter === everyone || payment.createdBy === filter,
  );
  const selected = payments.find(({ id }) => id === selectedId);
  const amount = (halere: number) => czk(halere, copy, locale);

  return (
    <DemoScreen
      tabBar={tabBar}
      overlay={
        <>
          <DemoSheet
            open={selected !== undefined}
            onClose={() => setSelectedId(undefined)}
            title={t.paymentDetail}
          >
            {selected ? (
              <Stack gap="$lg" paddingTop="$sm">
                <Stack alignItems="center" gap="$sm">
                  <AmountDisplay
                    value={formatCrowns(selected.halere, locale)}
                    unit={t.currency}
                    size="md"
                  />
                  <Row justifyContent="center">
                    <StatusBadge
                      status={selected.status}
                      label={t.status[selected.status]}
                    />
                  </Row>
                </Stack>
                <DetailRows
                  details={[
                    {
                      label: t.method,
                      value: methodLabel(selected.method, copy),
                    },
                    ...(selected.sats !== undefined
                      ? [
                          {
                            label: t.inBitcoin,
                            value: t.amountSats(
                              formatNumber(selected.sats, locale),
                            ),
                          },
                        ]
                      : []),
                    ...(selected.variableSymbol
                      ? [
                          {
                            label: t.variableSymbol,
                            value: selected.variableSymbol,
                          },
                        ]
                      : []),
                    {
                      label: t.created,
                      value: formatDateTime(selected.at, locale),
                    },
                    ...(selected.paidAt
                      ? [
                          {
                            label: t.paidAt,
                            value: formatDateTime(selected.paidAt, locale),
                          },
                        ]
                      : []),
                    {
                      label: t.createdBy,
                      value: creatorName(selected, employees, copy),
                    },
                    ...(selected.status === "paid" &&
                    selected.method !== "bank" &&
                    selected.createdBy !== ownerId
                      ? [{ label: t.funds, value: t.fundsInWallet }]
                      : []),
                  ]}
                />
              </Stack>
            ) : null}
          </DemoSheet>
          <DemoSheet
            open={choosing}
            onClose={() => setChoosing(false)}
            title={t.filterTitle}
          >
            <Card paddingVertical="$sm" gap="$none">
              {filters.map(({ value, label }) => (
                <ListRow
                  key={value}
                  title={label}
                  trailing={
                    value === filter ? (
                      <Icon name="Check" color="$accentText" />
                    ) : undefined
                  }
                  chevron={false}
                  onPress={() => {
                    setFilter(value);
                    setChoosing(false);
                  }}
                />
              ))}
            </Card>
          </DemoSheet>
        </>
      }
    >
      <Screen>
        <Row justifyContent="space-between" alignItems="center">
          <Text variant="heading" role="heading">
            {t.tabs.history}
          </Text>
          <Button
            size="sm"
            variant="secondary"
            icon="Users"
            onPress={() => setChoosing(true)}
          >
            {filters.find(({ value }) => value === filter)?.label ?? t.everyone}
          </Button>
        </Row>
        {shown.length === 0 ? (
          <EmptyState
            icon="History"
            title={t.historyEmptyTitle}
            description={t.historyEmptyDescription}
          />
        ) : null}
        {groupByDay(shown).map((day) => (
          <Section
            key={day.startMs}
            title={dayTitle(day.startMs, copy, locale)}
            trailing={
              <Text variant="label" muted fontVariant={["tabular-nums"]}>
                {t.dayTotal(amount(paidTotal(day.payments)))}
              </Text>
            }
          >
            <Card paddingVertical="$sm" gap="$none">
              {day.payments.map((payment) => (
                <ListRow
                  key={payment.id}
                  icon={methodIcons[payment.method]}
                  title={amount(payment.halere)}
                  description={`${formatTime(payment.at, locale)} · ${creatorName(payment, employees, copy)}`}
                  trailing={
                    <StatusBadge
                      status={payment.status}
                      label={t.status[payment.status]}
                    />
                  }
                  chevron={false}
                  onPress={() => setSelectedId(payment.id)}
                />
              ))}
            </Card>
          </Section>
        ))}
      </Screen>
    </DemoScreen>
  );
}
