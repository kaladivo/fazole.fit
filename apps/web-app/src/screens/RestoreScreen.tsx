import {
  Button,
  MnemonicGrid,
  Notice,
  Screen,
  Stack,
  Text,
  TopBar,
} from "@platitprosim/ui";
import { isMnemonicWord } from "@platitprosim/core";
import { useState } from "react";
import { useI18n } from "../i18n";
import { reloadAt } from "../routing";
import {
  parseMnemonic,
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
  const [words, setWords] = useState(() => Array<string>(WORD_COUNT).fill(""));
  const [invalid, setInvalid] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const unknownWords = words.flatMap((word, index) =>
    word !== "" && !isMnemonicWord(word) ? [index] : [],
  );

  const restore = async () => {
    const mnemonic = parseMnemonic(words.join(" "));
    if (!mnemonic) return setInvalid(true);
    setRestoring(true);
    await restoreDevice(evolu, mnemonic);
    reloadAt("restoring");
  };

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
        <MnemonicGrid
          words={words}
          onWordsChange={(next) => {
            setWords(next);
            setInvalid(false);
          }}
          invalid={unknownWords}
          accessibilityLabel={t("backupWords")}
          wordLabel={(position) => t("backupWord", { position })}
        />
        {invalid ? <Notice tone="danger" title={t("restoreInvalid")} /> : null}
        <Button
          testID="restore-submit"
          size="lg"
          icon="RotateCcw"
          loading={restoring}
          disabled={
            words.some((word) => word === "") || unknownWords.length > 0
          }
          onPress={() => void restore()}
        >
          {t("restoreSubmit")}
        </Button>
      </Screen>
    </Stack>
  );
}
