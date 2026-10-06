import { UIProvider } from "@platitprosim/ui";
import { useColorMode } from "./colorMode";
import { I18nProvider } from "./i18n/I18nProvider";
import { AppShell } from "./shell/AppShell";

export function App() {
  return (
    <UIProvider mode={useColorMode()}>
      <I18nProvider>
        <AppShell />
      </I18nProvider>
    </UIProvider>
  );
}
