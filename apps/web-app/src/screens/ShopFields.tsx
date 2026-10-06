import { Stack, TextField } from "@platitprosim/ui";
import { useI18n } from "../i18n";
import type { ShopForm } from "./shopForm";

export function ShopFields({
  form,
  onSubmitEditing,
}: {
  form: ShopForm;
  onSubmitEditing: () => void;
}) {
  const { t } = useI18n();
  const { accountCheck } = form;
  return (
    <Stack gap="$lg">
      <TextField
        testID="shop-name"
        label={t("shopName")}
        placeholder={t("shopNamePlaceholder")}
        hint={t("shopNameHint")}
        error={form.nameError ? t(form.nameError) : undefined}
        value={form.name}
        onChangeText={form.setName}
        maxLength={100}
        autoComplete="organization"
        returnKeyType="next"
      />
      <TextField
        testID="shop-account"
        label={t("bankAccount")}
        placeholder={t("bankAccountPlaceholder")}
        hint={
          accountCheck.ok
            ? t("bankAccountValid", {
                bank: accountCheck.bank,
                iban: accountCheck.iban,
              })
            : t("bankAccountHint")
        }
        error={form.accountError ? t(form.accountError) : undefined}
        value={form.account}
        onChangeText={form.setAccount}
        onBlur={form.touchAccount}
        inputMode="numeric"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        onSubmitEditing={onSubmitEditing}
      />
    </Stack>
  );
}
