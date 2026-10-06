import { EmptyState, Screen, Text } from "@platitprosim/ui";
import { useI18n } from "../i18n";

export function HistoryScreen() {
  const { t } = useI18n();
  return (
    <Screen testID="history-screen">
      <Text variant="heading" role="heading">
        {t("sectionHistory")}
      </Text>
      <EmptyState
        icon="History"
        title={t("historyEmptyTitle")}
        description={t("historyEmptyDescription")}
      />
    </Screen>
  );
}
