import { Button, EmptyState, Screen, Text } from "@platitprosim/ui";
import { useI18n } from "../i18n";

export function EmployeesScreen() {
  const { t } = useI18n();
  return (
    <Screen testID="employees-screen">
      <Text variant="heading" role="heading">
        {t("sectionEmployees")}
      </Text>
      <EmptyState
        icon="Users"
        title={t("employeesEmptyTitle")}
        description={t("employeesEmptyDescription")}
        action={
          <Button icon="UserPlus" disabled>
            {t("employeesAdd")}
          </Button>
        }
      />
    </Screen>
  );
}
