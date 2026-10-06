import type { ReactNode } from "react";
import { View } from "tamagui";
import { Pressable } from "./controls";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import { Row, Stack, Text } from "./layout";
import { border } from "./tokens";

export interface TopBarProps {
  title?: string | undefined;
  /** A muted line under the title, e.g. the shop name. */
  subtitle?: string | undefined;
  leading?: ReactNode;
  trailing?: ReactNode;
}

/** The screen header: title at the start, actions at the end. */
export function TopBar({ title, subtitle, leading, trailing }: TopBarProps) {
  return (
    <Row
      role="banner"
      minHeight="$controlLg"
      paddingHorizontal="$xl"
      paddingVertical="$sm"
      gap="$sm"
      backgroundColor="$background"
      zIndex="$sticky"
    >
      {leading}
      <Stack flex={1} gap="$none">
        {title ? (
          <Text variant="title" role="heading" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" muted numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {trailing ? <Row gap="$xs">{trailing}</Row> : null}
    </Row>
  );
}

export interface NavItem<T extends string = string> {
  value: T;
  label: string;
  icon: IconName;
  testID?: string | undefined;
}

export interface TabBarProps<T extends string> {
  accessibilityLabel: string;
  items: readonly NavItem<T>[];
  value: T | undefined;
  onValueChange: (value: T) => void;
}

/** The main sections docked at the bottom of phone screens: an icon over a short label. */
export function TabBar<T extends string>({
  accessibilityLabel,
  items,
  value,
  onValueChange,
}: TabBarProps<T>) {
  return (
    <Row
      role="tablist"
      aria-label={accessibilityLabel}
      gap="$none"
      paddingHorizontal="$xs"
      paddingTop="$xs"
      paddingBottom="$sm"
      borderTopWidth={border.hairline}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            testID={item.testID}
            onPress={() => onValueChange(item.value)}
            flex={1}
            flexDirection="column"
            justifyContent="center"
            gap="$xxs"
            paddingVertical="$xs"
            borderRadius="$control"
          >
            <View
              width="$controlLg"
              height="$controlSm"
              borderRadius="$pill"
              alignItems="center"
              justifyContent="center"
              backgroundColor={active ? "$accentSoft" : "$transparent"}
              transition="fast"
            >
              <Icon
                name={item.icon}
                color={active ? "$accentText" : "$colorMuted"}
              />
            </View>
            <Text
              variant="caption"
              fontWeight={active ? "$bold" : "$semibold"}
              color={active ? "$color" : "$colorMuted"}
              textAlign="center"
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

export interface NavigationRailProps<T extends string> {
  accessibilityLabel: string;
  items: readonly NavItem<T>[];
  /** Pinned to the bottom of the rail, e.g. settings. */
  footerItems?: readonly NavItem<T>[] | undefined;
  value: T | undefined;
  onValueChange: (value: T) => void;
  /** Centered above the items, e.g. the brand mark. */
  header?: ReactNode;
}

/** The full-height column of main sections on wide screens; the TabBar's desktop twin. */
export function NavigationRail<T extends string>({
  accessibilityLabel,
  items,
  footerItems = [],
  value,
  onValueChange,
  header,
}: NavigationRailProps<T>) {
  const renderItem = (item: NavItem<T>) => {
    const active = item.value === value;
    return (
      <Pressable
        key={item.value}
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        testID={item.testID}
        onPress={() => onValueChange(item.value)}
        flexDirection="column"
        justifyContent="center"
        gap="$xs"
        paddingVertical="$sm"
        borderRadius="$control"
        group
      >
        <View
          width="$controlLg"
          height="$controlSm"
          borderRadius="$pill"
          alignItems="center"
          justifyContent="center"
          backgroundColor={active ? "$accentSoft" : "$transparent"}
          $group-hover={active ? {} : { backgroundColor: "$neutralSoft" }}
          transition="fast"
        >
          <Icon
            name={item.icon}
            color={active ? "$accentText" : "$colorMuted"}
          />
        </View>
        <Text
          variant="caption"
          fontWeight={active ? "$bold" : "$semibold"}
          color={active ? "$color" : "$colorMuted"}
          textAlign="center"
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };
  return (
    <Stack
      role="navigation"
      aria-label={accessibilityLabel}
      width="$rail"
      flexShrink={0}
      gap="$sm"
      paddingTop="$xl"
      paddingHorizontal="$xs"
      paddingBottom="$lg"
      borderRightWidth={border.hairline}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      {header ? (
        <Stack alignItems="center" marginBottom="$lg">
          {header}
        </Stack>
      ) : null}
      <Stack flex={1} gap="$sm">
        {items.map(renderItem)}
      </Stack>
      {footerItems.map(renderItem)}
    </Stack>
  );
}
