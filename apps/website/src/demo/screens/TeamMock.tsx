import {
  Avatar,
  Button,
  Card,
  IconButton,
  ListRow,
  Pill,
  QRCode,
  Row,
  ScannerFrame,
  Screen,
  Stack,
  Text,
  TextField,
} from "@platitprosim/ui";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSite } from "../../site/site";
import { DemoScreen, DemoSheet } from "../chrome";
import { npubIn, shortNpub } from "../labels";
import { scannedProfile, useDemo } from "../store";

/** How long the demo camera takes to "read" the profile QR. */
const scanTakesMs = 1800;

/** Stands in for the camera: it "reads" the demo employee's profile QR. */
function DemoScanner({ onScan }: { onScan: (text: string) => void }) {
  const t = useSite().copy.demo;
  const [detected, setDetected] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => (detected ? onScan(scannedProfile.link) : setDetected(true)),
      detected ? scanTakesMs / 3 : scanTakesMs,
    );
    return () => clearTimeout(timer);
  }, [detected, onScan]);
  return (
    <ScannerFrame
      accessibilityLabel={t.scanner}
      hint={t.scanHint}
      detected={detected}
    >
      <Stack scale={0.8}>
        <QRCode value={scannedProfile.link} accessibilityLabel={t.scanner} />
      </Stack>
    </ScannerFrame>
  );
}

function AddEmployeeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useSite().copy.demo;
  const { employees, addEmployee } = useDemo();
  const [input, setInput] = useState("");
  const [name, setName] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const npub = npubIn(input);
  const profileName =
    npub === scannedProfile.npub ? scannedProfile.name : undefined;
  const shownName = name ?? profileName ?? "";
  const error =
    npub === undefined
      ? t.linkyProfileInvalid
      : employees.some((employee) => employee.npub === npub)
        ? t.alreadyAdded
        : undefined;

  const reset = () => {
    setInput("");
    setName(undefined);
    setScanning(false);
    setSubmitted(false);
    onClose();
  };
  const save = () => {
    setSubmitted(true);
    if (npub === undefined || error !== undefined) return;
    addEmployee(shownName.trim() || shortNpub(npub), npub);
    reset();
  };

  return (
    <DemoSheet open={open} onClose={reset} title={t.addEmployee}>
      <Stack gap="$lg" paddingTop="$sm">
        <Text muted>{t.addEmployeeDescription}</Text>
        {scanning ? (
          <DemoScanner
            onScan={(text) => {
              setInput(text);
              setName(undefined);
              setScanning(false);
            }}
          />
        ) : null}
        <TextField
          label={t.linkyProfile}
          placeholder="npub1…"
          hint={t.linkyProfileHint}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setName(undefined);
          }}
          error={
            (submitted || input.trim() !== "") && error !== undefined
              ? error
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
              accessibilityLabel={scanning ? t.close : t.scan}
              onPress={() => setScanning((current) => !current)}
            />
          }
        />
        {npub !== undefined && error === undefined ? (
          <>
            <Row gap="$md" alignItems="center">
              <Avatar name={shownName || "?"} />
              <Stack gap="$none" flex={1} minWidth={0}>
                <Text variant="label" numberOfLines={1}>
                  {profileName ?? t.profileMissing}
                </Text>
                <Text variant="caption" muted>
                  {shortNpub(npub)}
                </Text>
              </Stack>
            </Row>
            <TextField
              label={t.name}
              hint={t.nameHint}
              value={shownName}
              onChangeText={setName}
              onSubmitEditing={save}
            />
          </>
        ) : null}
        <Button size="lg" icon="UserPlus" onPress={save}>
          {t.addToTeam}
        </Button>
      </Stack>
    </DemoSheet>
  );
}

/** The owner's team, like the app's: each employee's device status, added by scanning a Linky profile. */
export function TeamMock({ tabBar }: { tabBar: ReactNode }) {
  const t = useSite().copy.demo;
  const { employees } = useDemo();
  const [adding, setAdding] = useState(false);
  return (
    <DemoScreen
      tabBar={tabBar}
      overlay={
        <AddEmployeeSheet open={adding} onClose={() => setAdding(false)} />
      }
    >
      <Screen width="narrow">
        <Row justifyContent="space-between" alignItems="center">
          <Text variant="heading" role="heading">
            {t.tabs.team}
          </Text>
          <Button
            size="sm"
            variant="secondary"
            icon="UserPlus"
            onPress={() => setAdding(true)}
          >
            {t.addEmployee}
          </Button>
        </Row>
        <Card paddingVertical="$sm" gap="$none">
          {employees.map((employee) => (
            <ListRow
              key={employee.id}
              leading={<Avatar name={employee.name} />}
              title={employee.name}
              description={shortNpub(employee.npub)}
              meta={
                employee.linked ? (
                  <Pill label={t.deviceLinked} tone="success" dot />
                ) : (
                  <Pill label={t.deviceWaiting} tone="warning" dot />
                )
              }
              chevron
            />
          ))}
        </Card>
        <Text variant="caption" muted>
          {t.teamHint}
        </Text>
      </Screen>
    </DemoScreen>
  );
}
