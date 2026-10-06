import {
  Button,
  IconButton,
  Notice,
  Screen,
  Stack,
  Text,
  TextField,
  TopBar,
} from "@platitprosim/ui";
import { isMnemonicWord } from "@platitprosim/core";
import { useState } from "react";
import { useI18n } from "../i18n";
import type { I18nKey } from "../i18n";
import { reloadAt } from "../routing";
import {
  parseMnemonic,
  phraseWords,
  restoreDevice,
  useAppEvolu,
  useShopProfile,
} from "../storage";
import { BackButton } from "./BackButton";

/** Evolu's AppOwner mnemonic has 24 words. */
const WORD_COUNT = 24;

export function RestoreScreen() {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const replacing = useShopProfile() !== null;
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<I18nKey | null>(null);
  const [restoring, setRestoring] = useState(false);
  const words = phraseWords(phrase);
  // The last word may still be half typed.
  const unknownWords = words
    .slice(0, -1)
    .filter((word) => !isMnemonicWord(word));

  const change = (text: string) => {
    setPhrase(text);
    setError(null);
  };
  const restore = async (text: string) => {
    const mnemonic = parseMnemonic(text);
    if (!mnemonic) return setError("restoreInvalid");
    setRestoring(true);
    await restoreDevice(evolu, mnemonic);
    reloadAt("restoring");
  };
  const restoreIfComplete = (text: string) => {
    change(text);
    if (phraseWords(text).length === WORD_COUNT) void restore(text);
  };
  const paste = async () => {
    try {
      restoreIfComplete(await navigator.clipboard.readText());
    } catch {
      setError("restorePasteFailed");
    }
  };

  const hint =
    words.length > WORD_COUNT
      ? t("restoreTooManyWords")
      : unknownWords.length > 0
        ? t("restoreUnknownWords", { words: unknownWords.join(", ") })
        : t("restoreWordCount", { count: words.length, total: WORD_COUNT });

  return (
    <Stack flex={1} gap="$none">
      <TopBar
        leading={<BackButton to={replacing ? "settings" : "welcome"} />}
      />
      <Screen width="narrow" testID="restore-screen">
        <Stack gap="$sm">
          <Text variant="heading" role="heading">
            {t("restoreTitle")}
          </Text>
          <Text muted>{t("restoreDescription", { count: WORD_COUNT })}</Text>
        </Stack>
        {replacing ? (
          <Notice tone="danger" title={t("restoreReplaceWarning")} />
        ) : null}
        <TextField
          testID="restore-phrase"
          label={t("backupTitle")}
          hideLabel
          name="password"
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoFocus
          value={phrase}
          onChangeText={change}
          onPaste={(event) => {
            event.preventDefault();
            restoreIfComplete(event.clipboardData.getData("text"));
          }}
          onSubmitEditing={() => void restore(phrase)}
          hint={hint}
          error={error ? t(error) : undefined}
          trailing={
            <IconButton
              testID="restore-paste"
              icon="ClipboardPaste"
              size="sm"
              accessibilityLabel={t("restorePaste")}
              onPress={() => void paste()}
            />
          }
        />
        <Button
          testID="restore-submit"
          size="lg"
          icon="RotateCcw"
          loading={restoring}
          disabled={words.length !== WORD_COUNT || unknownWords.length > 0}
          onPress={() => void restore(phrase)}
        >
          {t("restoreSubmit")}
        </Button>
      </Screen>
    </Stack>
  );
}
