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
  Sheet,
  Stack,
  StatusBadge,
  Text,
} from "@platitprosim/ui";
import { shortNpub } from "@platitprosim/core";
import { useState } from "react";
import {
  filterPayments,
  groupByDay,
  historyFilters,
  relativeDay,
} from "../history/history";
import type { HistoryFilter } from "../history/history";
import { useI18n } from "../i18n";
import type { I18nKey, Translate } from "../i18n";
import {
  formatCzkValue,
  formatDate,
  formatDateTime,
  formatTime,
  formatWhole,
} from "../i18n/format";
import { navigateTo, paymentRoute } from "../routing";
import { useEmployees, useIdentity, usePayments } from "../storage";
import type { Employee, Payment, ShopProfile } from "../storage";
import { DetailRows } from "./DetailRows";
import { methodIcons, methodLabels, statusLabels } from "./paymentLabels";

export function HistoryScreen({ profile }: { profile: ShopProfile }) {
  const { lang, t } = useI18n();
  const allPayments = usePayments();
  const employees = useEmployees();
  const { keys } = useIdentity();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [choosing, setChoosing] = useState(false);
  const owner = profile.role === "owner";
  const filters = owner ? historyFilters(allPayments, employees) : [];
  const payments = filterPayments(allPayments, filter);
  const selected = allPayments.find((payment) => payment.id === selectedId);
  const funds = selected ? forwardingLabel(selected, owner) : null;
  const employeeName = (employee: Employee) =>
    employee.name ?? shortNpub(employee.pubkey);
  const filterLabel = (value: HistoryFilter) => {
    if (value === "all") return t("historyFilterAll");
    if (value === "me") return t("historyMe");
    const employee = employees.find(({ id }) => id === value);
    return employee ? employeeName(employee) : t("historyEmployee");
  };
  const creatorOf = (payment: Payment) => {
    const employee =
      payment.employeeId === null
        ? undefined
        : employees.find(({ id }) => id === payment.employeeId);
    if (employee) return employeeName(employee);
    if (payment.employeeId !== null) return t("historyEmployee");
    // Every device restored from the owner's phrase shares its key.
    return payment.createdBy === keys.nostr.pubkey || !owner
      ? t("historyMe")
      : profile.name;
  };
  const czk = (amount: Payment["amountCzk"]) =>
    t("amountCzk", { amount: formatCzkValue(amount, lang) });
  const [now] = useState(() => Date.now());

  return (
    <Screen testID="history-screen">
      <Row justifyContent="space-between" alignItems="center">
        <Text variant="heading" role="heading">
          {t("sectionHistory")}
        </Text>
        {filters.length > 2 ? (
          <Button
            testID="history-filter"
            size="sm"
            variant="secondary"
            icon="Users"
            onPress={() => setChoosing(true)}
          >
            {filterLabel(filter)}
          </Button>
        ) : null}
      </Row>
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
        closeLabel={t("close")}
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
                ...(selected.sats !== null && selected.method !== "bank"
                  ? [
                      {
                        label: t("paymentSats"),
                        value: t("amountSats", {
                          sats: formatWhole(selected.sats, lang),
                        }),
                      },
                    ]
                  : []),
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
                ...(funds
                  ? [{ label: t("historyFunds"), value: t(funds) }]
                  : []),
              ]}
            />
            {selected.status === "pending" && selected.employeeId === null ? (
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
      <Sheet
        open={choosing}
        onOpenChange={setChoosing}
        title={t("historyFilterTitle")}
        closeLabel={t("close")}
      >
        <Card paddingVertical="$sm" gap="$none" testID="history-filter-sheet">
          {filters.map((value) => (
            <ListRow
              key={value}
              testID={`history-filter-${value}`}
              title={filterLabel(value)}
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
      </Sheet>
    </Screen>
  );
}

/** Where a paid Bitcoin payment's sats are: on the employee device, or in the owner's wallet. */
const forwardingLabel = (payment: Payment, owner: boolean): I18nKey | null => {
  if (payment.status !== "paid" || payment.method === "bank") return null;
  if (owner) {
    if (payment.employeeId === null) return null;
    return payment.forwardedAtMs === null
      ? "historyFundsOnTheWay"
      : "historyFundsReceived";
  }
  return payment.forwardedAtMs === null
    ? "historyFundsSending"
    : "historyFundsSent";
};

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
