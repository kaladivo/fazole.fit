import {
  Avatar,
  Button,
  Card,
  IconButton,
  ListRow,
  Pill,
  QRCode,
  ScannerFrame,
  Section,
  Stack,
  Text,
  TextField,
  TopBar,
} from "@platitprosim/ui";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSite } from "../../site/site";
import { DemoBody, DemoScreen } from "../chrome";
import { ownerId, scannedProfile, useDemo } from "../store";
import { paidTotal } from "../labels";
import { formatCzk } from "../money";

type Step = "list" | "scanning" | "found";

/** How long the demo camera takes to "read" the profile QR. */
const scanTakesMs = 1800;

function ScanStep({ onFound }: { onFound: () => void }) {
  const t = useSite().copy.demo;
  const [detected, setDetected] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => (detected ? onFound() : setDetected(true)),
      detected ? scanTakesMs / 3 : scanTakesMs,
    );
    return () => clearTimeout(timer);
  }, [detected, onFound]);
  return (
    <Stack flex={1} justifyContent="center">
      <ScannerFrame
        accessibilityLabel={t.scanner}
        hint={t.scanHint}
        detected={detected}
      >
        <Stack scale={0.8}>
          <QRCode value={scannedProfile.link} accessibilityLabel={t.scanner} />
        </Stack>
      </ScannerFrame>
    </Stack>
  );
}

function FoundStep({ onAdd }: { onAdd: (name: string) => void }) {
  const t = useSite().copy.demo;
  const [name, setName] = useState(scannedProfile.name);
  return (
    <Card gap="$lg" alignItems="center">
      <Avatar name={name || scannedProfile.name} size="lg" />
      <Pill label={t.profileFound} tone="success" icon="CircleCheck" />
      <Stack alignSelf="stretch">
        <TextField label={t.name} value={name} onChangeText={setName} />
      </Stack>
      <Button
        size="lg"
        icon="UserPlus"
        alignSelf="stretch"
        disabled={name.trim() === ""}
        onPress={() => onAdd(name.trim())}
      >
        {t.add}
      </Button>
    </Card>
  );
}

/** The owner's team: employees with today's takings, added by scanning a Linky profile. */
export function TeamMock({ tabBar }: { tabBar: ReactNode }) {
  const { copy, locale } = useSite();
  const t = copy.demo;
  const { payments, employees, addEmployee } = useDemo();
  const [step, setStep] = useState<Step>("list");
  const takings = (id: string) =>
    t.todayTotal(
      formatCzk(
        paidTotal(payments.filter((payment) => payment.createdBy === id)),
        locale,
      ),
    );

  if (step !== "list") {
    return (
      <DemoScreen>
        <TopBar
          title={t.addEmployee}
          leading={
            <IconButton
              icon="ArrowLeft"
              size="sm"
              accessibilityLabel={copy.demo.cancel}
              onPress={() => setStep("list")}
            />
          }
        />
        <DemoBody>
          {step === "scanning" ? (
            <ScanStep onFound={() => setStep("found")} />
          ) : (
            <FoundStep
              onAdd={(name) => {
                addEmployee(name);
                setStep("list");
              }}
            />
          )}
        </DemoBody>
      </DemoScreen>
    );
  }
  return (
    <DemoScreen tabBar={tabBar}>
      <TopBar
        title={t.tabs.team}
        subtitle={t.shopName}
        trailing={
          <IconButton
            icon="UserPlus"
            size="sm"
            accessibilityLabel={t.addEmployee}
            onPress={() => setStep("scanning")}
          />
        }
      />
      <DemoBody>
        <Section title={t.owner}>
          <ListRow
            leading={<Avatar name={t.you} icon="Store" />}
            title={t.you}
            description={takings(ownerId)}
          />
        </Section>
        <Section title={t.tabs.team}>
          <Stack gap="$none">
            {employees.map((employee) => (
              <ListRow
                key={employee.id}
                leading={<Avatar name={employee.name} />}
                title={employee.name}
                description={takings(employee.id)}
                trailing={
                  employee.addedToday ? (
                    <Pill label={t.addedToday} tone="success" />
                  ) : undefined
                }
              />
            ))}
          </Stack>
        </Section>
        <Button
          variant="secondary"
          icon="ScanLine"
          onPress={() => setStep("scanning")}
        >
          {t.addEmployee}
        </Button>
        <Text variant="caption" muted textAlign="center">
          {t.scanHint}
        </Text>
      </DemoBody>
    </DemoScreen>
  );
}
