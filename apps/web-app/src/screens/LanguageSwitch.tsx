import { SegmentedControl } from "@platitprosim/ui";
import { useI18n } from "../i18n";

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <SegmentedControl
      accessibilityLabel={t("settingsLanguage")}
      value={lang}
      onValueChange={setLang}
      options={[
        { value: "cs", label: t("languageCs") },
        { value: "en", label: t("languageEn") },
      ]}
    />
  );
}
