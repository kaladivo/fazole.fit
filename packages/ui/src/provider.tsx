import type { ReactNode } from "react";
import { TamaguiProvider } from "tamagui";
import { config } from "./config";
import type { ColorMode } from "./tokens";

export interface UIProviderProps {
  mode: ColorMode;
  children: ReactNode;
}

export function UIProvider({ mode, children }: UIProviderProps) {
  return (
    <TamaguiProvider config={config} defaultTheme={mode}>
      {children}
    </TamaguiProvider>
  );
}
