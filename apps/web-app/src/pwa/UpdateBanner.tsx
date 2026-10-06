import { Notice } from "@platitprosim/ui";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { applyUpdate, subscribeNeedRefresh } from "./update";

export function UpdateBanner() {
  const { t } = useI18n();
  const [needRefresh, setNeedRefresh] = useState(false);
  useEffect(() => subscribeNeedRefresh(setNeedRefresh), []);
  if (!needRefresh) return null;
  return (
    <Notice
      solid
      title={t("updateAvailable")}
      icon="RefreshCcw"
      action={{ label: t("updateApply"), onPress: () => void applyUpdate() }}
    />
  );
}
