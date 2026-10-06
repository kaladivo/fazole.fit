import {
  IconButton,
  Pressable,
  Row,
  ScrollView,
  shadow,
  space,
  Stack,
  TabBar,
  Text,
} from "@platitprosim/ui";
import type { NavItem } from "@platitprosim/ui";
import type { ReactNode } from "react";
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

/** A mock screen: its content clipped above the tab bar, like the app's, with room for an overlay over both. */
export function DemoScreen({
  tabBar,
  overlay,
  children,
}: {
  tabBar?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack flex={1} gap="$none" minHeight={0}>
      <Stack flex={1} gap="$none" minHeight={0} overflow="hidden">
        {children}
      </Stack>
      {tabBar}
      {overlay}
    </Stack>
  );
}

const rise = { opacity: 0, y: space.huge } as const;

const dialogFrame = {
  gap: "$md",
  padding: "$xl",
  borderRadius: "$card",
} as const;

const sheetFrame = {
  gap: "$sm",
  paddingHorizontal: "$xl",
  paddingTop: "$md",
  paddingBottom: "$xxl",
  borderTopLeftRadius: "$sheet",
  borderTopRightRadius: "$sheet",
} as const;

/**
 * The app's `Sheet` (or, as a `dialog`, its `Dialog`) drawn inside the phone:
 * the real ones portal over the whole page.
 */
export function DemoSheet({
  open,
  onClose,
  title,
  dialog = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  dialog?: boolean;
  children: ReactNode;
}) {
  const { close } = useSite().copy.demo;
  if (!open) return null;
  return (
    <Stack
      position="absolute"
      inset={0}
      zIndex="$overlay"
      gap="$none"
      justifyContent={dialog ? "center" : "flex-end"}
      padding={dialog ? "$xxl" : "$none"}
      paddingTop={dialog ? "$xxl" : "$huge"}
    >
      <Pressable
        position="absolute"
        inset={0}
        cursor="default"
        backgroundColor="$scrim"
        aria-hidden
        tabIndex={-1}
        onPress={onClose}
        transition="fast"
        enterStyle={{ opacity: 0 }}
      />
      <Stack
        role="dialog"
        aria-label={title}
        position="relative"
        maxHeight="100%"
        backgroundColor="$surface"
        boxShadow={shadow.floating}
        transition="base"
        enterStyle={rise}
        {...(dialog ? dialogFrame : sheetFrame)}
      >
        <Row justifyContent="flex-end" marginRight={-space.sm}>
          {dialog ? (
            <Text flex={1} variant="title">
              {title}
            </Text>
          ) : (
            <Text flex={1} variant="label" muted paddingVertical="$xs">
              {title}
            </Text>
          )}
          <IconButton
            icon="X"
            size="sm"
            accessibilityLabel={close}
            onPress={onClose}
          />
        </Row>
        <ScrollView flexShrink={1}>
          <Stack>{children}</Stack>
        </ScrollView>
      </Stack>
    </Stack>
  );
}

/** Label and value pairs, like the app's `DetailRows`. */
export function DetailRows({
  details,
}: {
  details: readonly { label: string; value: string }[];
}) {
  return (
    <Stack gap="$sm">
      {details.map(({ label, value }) => (
        <Row key={label} justifyContent="space-between" alignItems="flex-start">
          <Text variant="label" muted fontWeight="$regular">
            {label}
          </Text>
          <Text
            variant="label"
            flexShrink={1}
            textAlign="right"
            fontVariant={["tabular-nums"]}
          >
            {value}
          </Text>
        </Row>
      ))}
    </Stack>
  );
}
