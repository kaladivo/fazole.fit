import type { Pubkey } from "@linky-fit/linkstr";
import { parsePubkeyInput, shortNpub } from "@platitprosim/core";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  Pill,
  QRScanner,
  Row,
  Screen,
  Sheet,
  Stack,
  Text,
  TextField,
} from "@platitprosim/ui";
import { useState } from "react";
import { useI18n } from "../i18n";
import type { I18nKey, Translate } from "../i18n";
import { useAppServices, useProfileOf } from "../services";
import {
  addEmployee,
  isActive,
  isTrusted,
  renameEmployee,
  useAppEvolu,
  useEmployeeDevices,
  useEmployees,
  useIdentity,
} from "../storage";
import type { Employee, EmployeeId } from "../storage";
import { ConfirmDialog } from "./ConfirmDialog";

type OpenSheet =
  | { readonly kind: "add" }
  | { readonly kind: "edit"; readonly id: EmployeeId };

export function EmployeesScreen() {
  const { t } = useI18n();
  const employees = useEmployees().filter(isActive);
  const devices = useEmployeeDevices().filter(isTrusted);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const editing =
    sheet?.kind === "edit"
      ? employees.find((employee) => employee.id === sheet.id)
      : undefined;
  const close = () => setSheet(null);
  const add = () => setSheet({ kind: "add" });

  return (
    <Screen width="narrow" testID="employees-screen">
      <Row justifyContent="space-between" alignItems="center">
        <Text variant="heading" role="heading">
          {t("sectionEmployees")}
        </Text>
        {employees.length > 0 ? (
          <Button
            testID="employees-add"
            size="sm"
            variant="secondary"
            icon="UserPlus"
            onPress={add}
          >
            {t("employeesAdd")}
          </Button>
        ) : null}
      </Row>
      {employees.length === 0 ? (
        <EmptyState
          icon="Users"
          title={t("employeesEmptyTitle")}
          description={t("employeesEmptyDescription")}
          action={
            <Button testID="employees-add" icon="UserPlus" onPress={add}>
              {t("employeesAdd")}
            </Button>
          }
        />
      ) : (
        <>
          <Card paddingVertical="$sm" gap="$none">
            {employees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                devices={
                  devices.filter((device) => device.employeeId === employee.id)
                    .length
                }
                onPress={() => setSheet({ kind: "edit", id: employee.id })}
              />
            ))}
          </Card>
          <Text variant="caption" muted>
            {t("employeesHint")}
          </Text>
        </>
      )}
      <AddEmployeeSheet
        open={sheet?.kind === "add"}
        onClose={close}
        employees={employees}
      />
      {editing ? (
        <EditEmployeeSheet
          key={editing.id}
          employee={editing}
          devices={
            devices.filter((device) => device.employeeId === editing.id).length
          }
          onClose={close}
        />
      ) : null}
    </Screen>
  );
}

/** The name the owner chose, else the Linky name, else the short npub. */
const useDisplayName = (employee: Employee) => {
  const { profiles } = useAppServices();
  const profile = useProfileOf(profiles, employee.pubkey);
  return {
    name: employee.name ?? profile?.name ?? shortNpub(employee.pubkey),
    picture: profile?.picture ?? undefined,
  };
};

function EmployeeRow({
  employee,
  devices,
  onPress,
}: {
  employee: Employee;
  devices: number;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const { name, picture } = useDisplayName(employee);
  return (
    <ListRow
      testID={`employee-row-${employee.pubkey}`}
      leading={<Avatar name={name} uri={picture} />}
      title={name}
      description={shortNpub(employee.pubkey)}
      trailing={<DeviceStatus devices={devices} t={t} />}
      onPress={onPress}
    />
  );
}

function DeviceStatus({ devices, t }: { devices: number; t: Translate }) {
  return devices === 0 ? (
    <Pill label={t("employeeDeviceWaiting")} tone="warning" dot />
  ) : (
    <Pill
      label={
        devices === 1
          ? t("employeeDeviceActive")
          : t("employeeDevicesActive", { count: devices })
      }
      tone="success"
      dot
    />
  );
}

function AddEmployeeSheet({
  open,
  onClose,
  employees,
}: {
  open: boolean;
  onClose: () => void;
  employees: readonly Employee[];
}) {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const { keys } = useIdentity();
  const { profiles } = useAppServices();
  const [input, setInput] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const pubkey = parsePubkeyInput(input);
  const profile = useProfileOf(profiles, pubkey);
  const shownName = name ?? profile?.name ?? "";
  const pubkeyError = pubkeyProblem(pubkey, keys.nostr.pubkey, employees);

  const reset = () => {
    setInput("");
    setName(null);
    setScanning(false);
    setSubmitted(false);
    onClose();
  };

  const save = async () => {
    setSubmitted(true);
    if (pubkey === null || pubkeyError !== null) return;
    setBusy(true);
    try {
      await addEmployee(evolu, { pubkey, name: shownName });
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
      }}
      title={t("employeesAdd")}
    >
      <Stack gap="$lg" paddingTop="$sm" testID="add-employee-sheet">
        <Text muted>{t("employeesAddDescription")}</Text>
        {scanning ? (
          <QRScanner
            accessibilityLabel={t("linkyScanner")}
            hint={t("linkyScannerHint")}
            unavailableHint={t("linkyScannerUnavailable")}
            onScan={(text) => {
              if (parsePubkeyInput(text) === null) return;
              setInput(text);
              setScanning(false);
            }}
          />
        ) : null}
        <TextField
          testID="add-employee-pubkey"
          label={t("linkyRecipient")}
          placeholder="npub1…"
          hint={t("linkyRecipientHint")}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setName(null);
          }}
          error={
            (submitted || input.trim() !== "") && pubkeyError !== null
              ? t(pubkeyError)
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
        {pubkey !== null && pubkeyError === null ? (
          <>
            <Row gap="$md" alignItems="center">
              <Avatar
                name={shownName || "?"}
                uri={profile?.picture ?? undefined}
              />
              <Stack gap="$none" flex={1} minWidth={0}>
                <Text variant="label" numberOfLines={1}>
                  {profile === undefined
                    ? t("employeesProfileLoading")
                    : (profile?.name ?? t("employeesProfileMissing"))}
                </Text>
                <Text variant="caption" muted>
                  {shortNpub(pubkey)}
                </Text>
              </Stack>
            </Row>
            <TextField
              testID="add-employee-name"
              label={t("employeeName")}
              hint={t("employeeNameHint")}
              value={shownName}
              onChangeText={setName}
              onSubmitEditing={() => void save()}
            />
          </>
        ) : null}
        <Button
          testID="add-employee-submit"
          size="lg"
          icon="UserPlus"
          loading={busy}
          onPress={() => void save()}
        >
          {t("employeesAddSubmit")}
        </Button>
      </Stack>
    </Sheet>
  );
}

const pubkeyProblem = (
  pubkey: Pubkey | null,
  own: Pubkey,
  employees: readonly Employee[],
): I18nKey | null =>
  pubkey === null
    ? "linkyRecipientInvalid"
    : pubkey === own
      ? "employeesOwnKey"
      : employees.some((employee) => employee.pubkey === pubkey)
        ? "employeesAlreadyAdded"
        : null;

function EditEmployeeSheet({
  employee,
  devices,
  onClose,
}: {
  employee: Employee;
  devices: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const { team } = useAppServices();
  const { name: displayName, picture } = useDisplayName(employee);
  const [name, setName] = useState(employee.name ?? "");
  const [confirming, setConfirming] = useState(false);

  const save = async () => {
    await renameEmployee(evolu, employee.id, name);
    onClose();
  };
  const remove = async () => {
    setConfirming(false);
    await team.removeEmployee(employee);
    onClose();
  };

  return (
    <>
      <Sheet
        open={!confirming}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        title={t("employeeEdit")}
      >
        <Stack gap="$lg" paddingTop="$sm" testID="edit-employee-sheet">
          <Row gap="$md" alignItems="center">
            <Avatar name={displayName} uri={picture} />
            <Stack gap="$none" flex={1} minWidth={0}>
              <Text variant="label" numberOfLines={1}>
                {displayName}
              </Text>
              <Text variant="caption" muted>
                {shortNpub(employee.pubkey)}
              </Text>
            </Stack>
            <DeviceStatus devices={devices} t={t} />
          </Row>
          {devices === 0 ? (
            <Text variant="caption" muted>
              {t("employeeDeviceWaitingHint")}
            </Text>
          ) : null}
          <TextField
            testID="edit-employee-name"
            label={t("employeeName")}
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => void save()}
          />
          <Stack gap="$sm">
            <Button
              testID="edit-employee-save"
              size="lg"
              onPress={() => void save()}
            >
              {t("save")}
            </Button>
            <Button
              testID="edit-employee-remove"
              variant="ghost"
              icon="Trash2"
              onPress={() => setConfirming(true)}
            >
              {t("employeeRemove")}
            </Button>
          </Stack>
        </Stack>
      </Sheet>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("employeeRemoveTitle", { name: displayName })}
        description={t("employeeRemoveDescription")}
        confirm={t("employeeRemoveConfirm")}
        destructive
        onConfirm={() => void remove()}
      />
    </>
  );
}
