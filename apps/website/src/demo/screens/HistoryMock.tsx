import {
  Card,
  ListRow,
  Row,
  SegmentedControl,
  Section,
  Stack,
  StatusBadge,
  Text,
  TopBar,
} from "@platitprosim/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import { useSite } from "../../site/site";
import { DemoBody, DemoScreen } from "../chrome";
import { ownerId, useDemo } from "../store";
import {
  creatorName,
  formatTime,
  methodIcons,
  methodLabel,
  paidTotal,
} from "../labels";
import { formatCzk, formatNumber } from "../money";

const everyone = "everyone";

/** The owner's history: every payment, a filter by employee and the day's total. */
export function HistoryMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { payments, employees } = useDemo();
  const [filter, setFilter] = useState(everyone);
  const shown = payments.filter(
    (payment) => filter === everyone || payment.createdBy === filter,
  );
  const paidCount = shown.filter((payment) => payment.status === "paid").length;
  return (
    <DemoScreen tabBar={tabBar}>
      <TopBar title={t.tabs.history} subtitle={t.shopName} />
      <DemoBody>
        <Card tone="accent" gap="$xs" padding="$lg">
          <Text eyebrow>{t.dayTotal}</Text>
          <Row justifyContent="space-between" alignItems="baseline">
            <Text variant="display" color="$colorStrong">
              {formatCzk(paidTotal(shown), locale)}
            </Text>
            <Text variant="label" muted>
              {t.paymentCount(paidCount)}
            </Text>
          </Row>
        </Card>
        <SegmentedControl
          accessibilityLabel={t.filter}
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: everyone, label: t.everyone },
            ...employees.map((employee) => ({
              value: employee.id,
              label: employee.name.split(" ")[0] ?? employee.name,
            })),
            { value: ownerId, label: t.you },
          ]}
        />
        <Section title={t.today}>
          <Stack gap="$none">
            {shown.map((payment) => (
              <ListRow
                key={payment.id}
                icon={methodIcons[payment.method]}
                title={formatCzk(payment.halere, locale)}
                description={[
                  creatorName(payment, employees, copy),
                  formatTime(payment.at, locale),
                  payment.sats === undefined
                    ? methodLabel(payment.method, copy)
                    : `${formatNumber(payment.sats, locale)} ${t.sat}`,
                ].join(" · ")}
                trailing={
                  <StatusBadge
                    status={payment.status}
                    label={t.status[payment.status]}
                  />
                }
              />
            ))}
          </Stack>
        </Section>
      </DemoBody>
    </DemoScreen>
  );
}
