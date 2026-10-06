import {
  Button,
  EmptyState,
  Pill,
  Screen,
  Stack,
  TopBar,
} from "@platitprosim/ui";
import { useI18n } from "../i18n";
import { BackButton } from "./BackButton";

/** "I'm an employee": the Linky login arrives in the next slice. */
export function EmployeeScreen() {
  const { t } = useI18n();
  return (
    <Stack flex={1} gap="$none">
      <TopBar leading={<BackButton to="welcome" />} />
      <Screen width="narrow" centered testID="employee-screen">
        <EmptyState
          icon="LogIn"
          title={t("employeeTitle")}
          description={t("employeeDescription")}
          action={
            <Stack alignItems="center" gap="$sm">
              <Button size="lg" icon="LogIn" disabled>
                {t("employeeLogin")}
              </Button>
              <Pill label={t("comingSoon")} tone="accent" />
            </Stack>
          }
        />
      </Screen>
    </Stack>
  );
}
