import { EvoluProvider } from "@evolu/react";
import type { ReactNode } from "react";
import type { AppEvolu } from "./evolu";
import { AppEvoluContext } from "./evolu";

/** Hands the app's Evolu instance to `useAppEvolu` and to Evolu's own hooks. */
export function StorageProvider({
  evolu,
  children,
}: {
  evolu: AppEvolu;
  children: ReactNode;
}) {
  return (
    <EvoluProvider value={evolu}>
      <AppEvoluContext value={evolu}>{children}</AppEvoluContext>
    </EvoluProvider>
  );
}
