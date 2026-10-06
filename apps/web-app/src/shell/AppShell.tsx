import {
  BrandMark,
  NavigationRail,
  Row,
  Stack,
  TabBar,
  useMedia,
} from "@platitprosim/ui";
import type { NavItem } from "@platitprosim/ui";
import type { ComponentType } from "react";
import { useI18n } from "../i18n";
import type { Translate } from "../i18n";
import { navigateTo, useRoute } from "../routing";
import type { Section } from "../routing";
import { EmployeesScreen } from "../screens/EmployeesScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TerminalScreen } from "../screens/TerminalScreen";
import { WalletScreen } from "../screens/WalletScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";

const screens: Record<Section, ComponentType> = {
  terminal: TerminalScreen,
  history: HistoryScreen,
  employees: EmployeesScreen,
  wallet: WalletScreen,
  settings: SettingsScreen,
};

const navItems = (t: Translate): NavItem<Section>[] => [
  { value: "terminal", label: t("sectionTerminal"), icon: "QrCode" },
  { value: "history", label: t("sectionHistory"), icon: "History" },
  { value: "employees", label: t("sectionEmployees"), icon: "Users" },
  { value: "wallet", label: t("sectionWallet"), icon: "Wallet" },
  { value: "settings", label: t("sectionSettings"), icon: "Settings" },
];

/** Bottom tabs on phones, a navigation rail on wide screens. */
export function AppShell() {
  const route = useRoute();
  const { t } = useI18n();
  const { wide } = useMedia();
  if (route === "welcome") return <WelcomeScreen />;

  const Screen = screens[route];
  const items = navItems(t);
  if (wide) {
    return (
      <Row flex={1} gap="$none" alignItems="stretch">
        <NavigationRail
          accessibilityLabel={t("navigation")}
          header={<BrandMark size="control" />}
          items={items.filter((item) => item.value !== "settings")}
          footerItems={items.filter((item) => item.value === "settings")}
          value={route}
          onValueChange={navigateTo}
        />
        <Stack flex={1} gap="$none" minWidth={0}>
          <Screen />
        </Stack>
      </Row>
    );
  }
  return (
    <Stack flex={1} gap="$none">
      <Stack flex={1} gap="$none" minHeight={0}>
        <Screen />
      </Stack>
      <TabBar
        accessibilityLabel={t("navigation")}
        items={items}
        value={route}
        onValueChange={navigateTo}
      />
    </Stack>
  );
}
