import {
  Button,
  Card,
  Dialog,
  ListRow,
  Pill,
  Section,
  TextField,
} from "@platitprosim/ui";
import type { Tone } from "@platitprosim/ui";
import { useState } from "react";
import { appConfig } from "../config";
import { useI18n } from "../i18n";
import type { I18nKey } from "../i18n";
import type { ServerStatus, ServerStatuses } from "../services";
import { ConfirmDialog } from "./ConfirmDialog";
import { checkServerUrl } from "./serverUrl";

const stateStyles = {
  connecting: { tone: "warning", label: "serverConnecting" },
  connected: { tone: "success", label: "serverConnected" },
  unreachable: { tone: "danger", label: "serverUnreachable" },
} as const satisfies Record<
  ServerStatus["state"],
  { tone: Tone; label: I18nKey }
>;

/** The defaults, which stay, and the shop's own servers, which it can add and remove. */
export function ServersSection({
  title,
  addLabel,
  addHint,
  defaults,
  own,
  statuses,
  onSave,
  testID,
}: {
  title: string;
  addLabel: string;
  /** Under the address field, e.g. that the app reloads. */
  addHint?: string | undefined;
  defaults: readonly string[];
  own: readonly string[];
  statuses: ServerStatuses;
  onSave: (own: readonly string[]) => Promise<void>;
  testID: string;
}) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const save = async (next: readonly string[]) => {
    await onSave(next);
    setAdding(false);
    setRemoving(null);
  };
  return (
    <Section title={title}>
      <Card paddingVertical="$sm" gap="$none" testID={testID}>
        {[...defaults, ...own].map((url) => {
          const status = statuses.get(url);
          const style = stateStyles[status?.state ?? "connecting"];
          return (
            <ListRow
              key={url}
              title={url}
              description={
                status?.state === "unreachable"
                  ? (status.detail ?? undefined)
                  : undefined
              }
              trailing={<Pill dot tone={style.tone} label={t(style.label)} />}
              onPress={own.includes(url) ? () => setRemoving(url) : undefined}
            />
          );
        })}
        <ListRow
          testID={`${testID}-add`}
          icon="Plus"
          title={addLabel}
          onPress={() => setAdding(true)}
        />
      </Card>
      {adding ? (
        <AddServerDialog
          title={addLabel}
          hint={addHint}
          listed={[...defaults, ...own]}
          onClose={() => setAdding(false)}
          onAdd={(url) => save([...own, url])}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("serverRemoveTitle")}
        description={removing ?? ""}
        confirm={t("serverRemove")}
        destructive
        onConfirm={() => void save(own.filter((url) => url !== removing))}
      />
    </Section>
  );
}

function AddServerDialog({
  title,
  hint,
  listed,
  onClose,
  onAdd,
}: {
  title: string;
  hint: string | undefined;
  listed: readonly string[];
  onClose: () => void;
  onAdd: (url: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const error = checkServerUrl(
    input,
    listed,
    appConfig.allowInsecureLocalhostRelays,
  );
  const add = () => {
    setSubmitted(true);
    if (error === null) void onAdd(input.trim());
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={title}
      closeLabel={t("close")}
      testID="add-server-dialog"
      actions={
        <Button testID="add-server-save" onPress={add}>
          {t("save")}
        </Button>
      }
    >
      <TextField
        testID="add-server-url"
        label={t("serverUrl")}
        placeholder="wss://…"
        hint={hint}
        value={input}
        onChangeText={setInput}
        onSubmitEditing={add}
        error={submitted && error !== null ? t(error) : undefined}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
    </Dialog>
  );
}
