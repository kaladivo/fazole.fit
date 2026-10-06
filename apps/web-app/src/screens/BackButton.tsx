import { IconButton } from "@platitprosim/ui";
import { useI18n } from "../i18n";
import { navigateTo } from "../routing";
import type { Route } from "../routing";

export function BackButton({ to }: { to: Route }) {
  const { t } = useI18n();
  return (
    <IconButton
      icon="ArrowLeft"
      accessibilityLabel={t("back")}
      onPress={() => navigateTo(to)}
    />
  );
}
