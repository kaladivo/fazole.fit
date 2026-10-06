import { Stack, TabBar } from "@platitprosim/ui";
import type { NavItem } from "@platitprosim/ui";
import type { ComponentProps, ReactNode } from "react";
import { useSite } from "../site/site";

export type DemoTab = "terminal" | "history" | "team" | "wallet" | "settings";

export function DemoTabBar({
  value,
  onValueChange,
}: {
  value: DemoTab;
  onValueChange: (tab: DemoTab) => void;
}) {
  const { tabs } = useSite().copy.demo;
  const items: NavItem<DemoTab>[] = [
    { value: "terminal", label: tabs.terminal, icon: "QrCode" },
    { value: "history", label: tabs.history, icon: "History" },
    { value: "team", label: tabs.team, icon: "Users" },
    { value: "wallet", label: tabs.wallet, icon: "Wallet" },
    { value: "settings", label: tabs.settings, icon: "Settings" },
  ];
  return (
    // Reaches under the phone's home indicator.
    <Stack gap="$none" paddingBottom="$lg" backgroundColor="$surface">
      <TabBar
        accessibilityLabel={tabs.label}
        items={items}
        value={value}
        onValueChange={onValueChange}
      />
    </Stack>
  );
}

/** A mock screen: its content clipped above the tab bar, like the app's. */
export function DemoScreen({
  tabBar,
  children,
}: {
  tabBar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack flex={1} gap="$none" minHeight={0}>
      <Stack flex={1} gap="$none" minHeight={0} overflow="hidden">
        {children}
      </Stack>
      {tabBar}
    </Stack>
  );
}

/** The page gutter under a top bar. */
export function DemoBody(props: ComponentProps<typeof Stack>) {
  return (
    <Stack
      flex={1}
      gap="$lg"
      paddingHorizontal="$xl"
      paddingTop="$sm"
      paddingBottom="$lg"
      minHeight={0}
      {...props}
    />
  );
}
