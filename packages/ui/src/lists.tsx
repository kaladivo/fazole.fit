import type { ReactNode } from "react";
import { View } from "tamagui";
import { Pressable } from "./controls";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import { Row, Stack, Text } from "./layout";
import { space } from "./tokens";

export interface ListRowProps {
  title: string;
  description?: string | undefined;
  /** An icon in a soft tile before the title; use `leading` for anything else, e.g. an `Avatar`. */
  icon?: IconName | undefined;
  leading?: ReactNode;
  /** Muted text at the end of the row, e.g. a setting's current value. */
  value?: string | undefined;
  /** Anything at the end of the row, e.g. an amount and a `StatusBadge`. */
  trailing?: ReactNode;
  onPress?: (() => void) | undefined;
  /** Defaults to true for pressable rows. */
  chevron?: boolean | undefined;
  destructive?: boolean | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}

/**
 * The single row primitive: settings links, payments, employees.
 * Its content lines up with the surrounding content; the press highlight extends `$md` past it on both sides.
 */
export function ListRow({
  title,
  description,
  icon,
  leading,
  value,
  trailing,
  onPress,
  chevron = onPress !== undefined,
  destructive = false,
  disabled = false,
  testID,
}: ListRowProps) {
  const Frame = onPress ? Pressable : Row;
  return (
    <Frame
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      gap="$md"
      minHeight="$row"
      marginHorizontal={-space.md}
      paddingHorizontal="$md"
      paddingVertical="$sm"
      borderRadius="$control"
      hoverStyle={onPress ? { backgroundColor: "$neutralSoft" } : {}}
      pressStyle={onPress ? { backgroundColor: "$neutralSoft" } : {}}
    >
      {icon ? (
        <View
          width="$avatar"
          height="$avatar"
          borderRadius="$control"
          alignItems="center"
          justifyContent="center"
          backgroundColor={destructive ? "$dangerSoft" : "$neutralSoft"}
        >
          <Icon
            name={icon}
            color={destructive ? "$dangerText" : "$colorSubtle"}
          />
        </View>
      ) : (
        leading
      )}
      <Stack flex={1} gap="$xxs">
        <Text
          fontWeight="$semibold"
          color={destructive ? "$dangerText" : "$color"}
          numberOfLines={2}
        >
          {title}
        </Text>
        {description ? (
          <Text variant="caption" muted numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </Stack>
      {value !== undefined ? (
        <Text variant="label" muted numberOfLines={1} maxWidth="50%">
          {value}
        </Text>
      ) : null}
      {trailing ? (
        <Stack flexShrink={0} alignItems="flex-end" gap="$xs">
          {trailing}
        </Stack>
      ) : null}
      {chevron ? (
        <Icon name="ChevronRight" size="sm" color="$colorMuted" />
      ) : null}
    </Frame>
  );
}
