import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { DemoTabBar } from "./chrome";
import type { DemoTab } from "./chrome";
import { PhoneFrame } from "./PhoneFrame";
import { HistoryMock } from "./screens/HistoryMock";
import { SettingsMock } from "./screens/SettingsMock";
import { TeamMock } from "./screens/TeamMock";
import { TerminalMock } from "./screens/TerminalMock";
import { WalletMock } from "./screens/WalletMock";

const screens: Record<DemoTab, ComponentType<{ tabBar: ReactNode }>> = {
  terminal: TerminalMock,
  history: HistoryMock,
  team: TeamMock,
  wallet: WalletMock,
  settings: SettingsMock,
};

export interface DemoAppProps {
  /** The tab the phone opens on; the visitor can switch tabs from there. */
  initialTab: DemoTab;
  accessibilityLabel: string;
  maxWidth: number;
}

/** The app with mock data in a phone: real UI components, working tabs. */
export function DemoApp({
  initialTab,
  accessibilityLabel,
  maxWidth,
}: DemoAppProps) {
  const [tab, setTab] = useState(initialTab);
  const Screen = screens[tab];
  return (
    <PhoneFrame accessibilityLabel={accessibilityLabel} maxWidth={maxWidth}>
      <Screen tabBar={<DemoTabBar value={tab} onValueChange={setTab} />} />
    </PhoneFrame>
  );
}
