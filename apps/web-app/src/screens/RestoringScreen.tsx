import { Button, Notice, Screen, Spinner, Stack, Text } from "@platitprosim/ui";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { resetDevice, useAppEvolu } from "../storage";

/** How long a restore may take before the screen suggests what could be wrong. */
const SLOW_RESTORE_MS = 20_000;

/** Waits for the shop or the membership to sync; the shell routes on once one arrives. */
export function RestoringScreen() {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_RESTORE_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Screen width="narrow" centered testID="restoring-screen">
      <Stack alignItems="center" gap="$lg">
        <Spinner size="lg" />
        <Text variant="title" textAlign="center" role="heading">
          {t("restoringTitle")}
        </Text>
        <Text muted textAlign="center">
          {t("restoringDescription")}
        </Text>
      </Stack>
      {slow ? (
        <Stack gap="$md">
          <Notice
            tone="warning"
            title={t("restoringSlowTitle")}
            description={t("restoringSlowDescription")}
          />
          <Button variant="ghost" onPress={() => void resetDevice(evolu)}>
            {t("restoringStartOver")}
          </Button>
        </Stack>
      ) : null}
    </Screen>
  );
}
