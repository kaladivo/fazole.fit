import { UIProvider } from "@platitprosim/ui";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { useColorMode } from "./colorMode";
import { AppServicesContext } from "./services";
import type { AppServices } from "./services";
import { I18nProvider } from "./i18n/I18nProvider";
import { AppShell } from "./shell/AppShell";
import { StorageProvider } from "./storage";
import type { AppEvolu } from "./storage";

function Themed({ children }: { children: ReactNode }) {
  return <UIProvider mode={useColorMode()}>{children}</UIProvider>;
}

export function App({
  evolu,
  services,
}: {
  evolu: AppEvolu;
  services: Promise<AppServices>;
}) {
  return (
    <StorageProvider evolu={evolu}>
      <AppServicesContext value={services}>
        {/* Evolu answers local queries within a frame; nothing is worth showing until it has. */}
        <Suspense fallback={null}>
          <Themed>
            <I18nProvider>
              <AppShell />
            </I18nProvider>
          </Themed>
        </Suspense>
      </AppServicesContext>
    </StorageProvider>
  );
}
