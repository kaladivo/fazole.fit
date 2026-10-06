import {
  BrandMark,
  NavigationRail,
  Row,
  Spinner,
  Stack,
  TabBar,
  useMedia,
} from "@platitprosim/ui";
import type { NavItem } from "@platitprosim/ui";
import { Suspense, useEffect } from "react";
import type { ComponentType } from "react";
import { holdsEmployeeScreen } from "../employee/employeeFlow";
import { useEmployeeStep } from "../employee/useEmployeeStep";
import { useI18n } from "../i18n";
import type { I18nKey } from "../i18n";
import {
  isFlow,
  isSection,
  navigateTo,
  paymentIdOf,
  replaceRoute,
  resolveRoute,
  sectionsFor,
  useRoute,
} from "../routing";
import type { Flow, Section } from "../routing";
import { BackupScreen } from "../screens/BackupScreen";
import { EmployeeScreen } from "../screens/EmployeeScreen";
import { EmployeesScreen } from "../screens/EmployeesScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { PaymentScreen } from "../screens/PaymentScreen";
import { RestoreScreen } from "../screens/RestoreScreen";
import { RestoringScreen } from "../screens/RestoringScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SetupShopScreen } from "../screens/SetupShopScreen";
import { TerminalScreen } from "../screens/TerminalScreen";
import { WalletScreen } from "../screens/WalletScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { useAppServices } from "../services";
import { useShopProfile } from "../storage";
import type { ShopProfile } from "../storage";

const sectionScreens: Record<
  Section,
  ComponentType<{ profile: ShopProfile }>
> = {
  terminal: TerminalScreen,
  history: HistoryScreen,
  employees: EmployeesScreen,
  wallet: WalletScreen,
  settings: SettingsScreen,
};

const flowScreens: Record<Flow, ComponentType> = {
  welcome: WelcomeScreen,
  setup: SetupShopScreen,
  backup: BackupScreen,
  restore: RestoreScreen,
  restoring: RestoringScreen,
  employee: EmployeeScreen,
};

const sectionNav: Record<
  Section,
  { label: I18nKey; icon: NavItem<Section>["icon"] }
> = {
  terminal: { label: "sectionTerminal", icon: "QrCode" },
  history: { label: "sectionHistory", icon: "History" },
  employees: { label: "sectionEmployees", icon: "Users" },
  wallet: { label: "sectionWallet", icon: "Wallet" },
  settings: { label: "sectionSettings", icon: "Settings" },
};

const loading = (
  <Stack flex={1} alignItems="center" justifyContent="center">
    <Spinner size="lg" />
  </Stack>
);

/** Routes by role: the welcome flows, a full-screen payment, or a section with its navigation. */
export function AppShell() {
  const route = useRoute();
  const profile = useShopProfile();
  const employee = useEmployeeStep();
  const resolved = resolveRoute(
    route,
    profile?.role ?? null,
    holdsEmployeeScreen(employee),
  );
  useEffect(() => {
    if (resolved !== route) replaceRoute(resolved);
  }, [resolved, route]);

  const paymentId = paymentIdOf(resolved);
  if (profile && paymentId) {
    return <PaymentScreen paymentId={paymentId} profile={profile} />;
  }
  if (profile && isSection(resolved)) {
    return <Sections section={resolved} profile={profile} />;
  }
  // Until the redirect lands, a route the role cannot open shows the welcome screen.
  const Flow = flowScreens[isFlow(resolved) ? resolved : "welcome"];
  return (
    <Suspense fallback={loading}>
      <Flow />
    </Suspense>
  );
}

/** Bottom tabs on phones, a navigation rail on wide screens. */
function Sections({
  section,
  profile,
}: {
  section: Section;
  profile: ShopProfile;
}) {
  const { t } = useI18n();
  const { wide } = useMedia();
  const { nostr } = useAppServices();
  useEffect(() => {
    void nostr.publishName(profile.name);
  }, [nostr, profile.name]);
  const Screen = sectionScreens[section];
  const items = sectionsFor(profile.role).map(
    (value): NavItem<Section> => ({
      value,
      label: t(sectionNav[value].label),
      icon: sectionNav[value].icon,
      testID: `nav-${value}`,
    }),
  );
  const body = (
    <Suspense fallback={loading}>
      <Screen profile={profile} />
    </Suspense>
  );
  if (wide) {
    return (
      <Row flex={1} gap="$none" alignItems="stretch">
        <NavigationRail
          accessibilityLabel={t("navigation")}
          header={<BrandMark size="control" />}
          items={items.filter((item) => item.value !== "settings")}
          footerItems={items.filter((item) => item.value === "settings")}
          value={section}
          onValueChange={navigateTo}
        />
        <Stack flex={1} gap="$none" minWidth={0}>
          {body}
        </Stack>
      </Row>
    );
  }
  return (
    <Stack flex={1} gap="$none">
      <Stack flex={1} gap="$none" minHeight={0}>
        {body}
      </Stack>
      <TabBar
        accessibilityLabel={t("navigation")}
        items={items}
        value={section}
        onValueChange={navigateTo}
      />
    </Stack>
  );
}
