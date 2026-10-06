import { useState } from "react";
import { Image, View } from "tamagui";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import { Row, Stack, Text } from "./layout";
import { Spinner } from "./spinner";
import { toneColors } from "./styles";
import type { TextVariant, Tone } from "./tokens";

const avatarSizes = {
  sm: { box: "$controlSm", text: "caption" },
  md: { box: "$avatar", text: "label" },
  lg: { box: "$hero", text: "display" },
} as const satisfies Record<string, { box: `$${string}`; text: TextVariant }>;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toUpperCase() || "?";

export interface AvatarProps {
  /** The initials come from it; without a name the avatar shows "?". */
  name: string;
  uri?: string | undefined;
  size?: keyof typeof avatarSizes | undefined;
  /** An icon instead of the initials without a photo, e.g. a shop. */
  icon?: IconName | undefined;
}

export function Avatar({ name, uri, size = "md", icon }: AvatarProps) {
  const dimensions = avatarSizes[size];
  const [failedUri, setFailedUri] = useState<string>();
  const showPhoto = uri !== undefined && uri !== failedUri;
  return (
    <View
      role="img"
      aria-label={name}
      width={dimensions.box}
      height={dimensions.box}
      flexShrink={0}
      borderRadius="$pill"
      overflow="hidden"
      alignItems="center"
      justifyContent="center"
      backgroundColor="$accentSoft"
    >
      {showPhoto ? (
        <Image
          src={uri}
          width="100%"
          height="100%"
          objectFit="cover"
          aria-hidden
          onError={() => setFailedUri(uri)}
        />
      ) : icon ? (
        <Icon
          name={icon}
          size={size === "lg" ? "xl" : size === "md" ? "md" : "sm"}
          color="$accentText"
        />
      ) : (
        <Text variant={dimensions.text} bold color="$accentText">
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

export interface PillProps {
  label: string;
  tone?: Tone | undefined;
  icon?: IconName | undefined;
  /** Shows a small dot before the label instead of an icon. */
  dot?: boolean | undefined;
  /** Shows a spinner before the label, e.g. for a payment in flight. */
  busy?: boolean | undefined;
  testID?: string | undefined;
}

/** A compact tag: a state, a method or a filter value. */
export function Pill({
  label,
  tone = "neutral",
  icon,
  dot = false,
  busy = false,
  testID,
}: PillProps) {
  const colors = toneColors[tone];
  return (
    <Row
      testID={testID}
      alignSelf="flex-start"
      gap="$xs"
      paddingHorizontal="$sm"
      paddingVertical="$xxs"
      borderRadius="$pill"
      backgroundColor={colors.background}
    >
      {busy ? (
        <Spinner color={colors.solid} />
      ) : icon ? (
        <Icon name={icon} size="sm" color={colors.color} />
      ) : dot ? (
        <View
          width="$dot"
          height="$dot"
          borderRadius="$pill"
          backgroundColor={colors.solid}
        />
      ) : null}
      <Text variant="caption" bold color={colors.color} numberOfLines={1}>
        {label}
      </Text>
    </Row>
  );
}

export type PaymentStatus = "pending" | "paid" | "cancelled";

const statusTones = {
  pending: "warning",
  paid: "success",
  cancelled: "neutral",
} as const satisfies Record<PaymentStatus, Tone>;

export interface StatusBadgeProps {
  status: PaymentStatus;
  /** The translated status name. */
  label: string;
}

/** A payment's state as a coloured pill with a dot. */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Pill
      label={label}
      tone={statusTones[status]}
      dot
      testID={`status-${status}`}
    />
  );
}

export interface AmountDisplayProps {
  /** The formatted amount, e.g. "1 250,50". */
  value: string;
  /** Shown after the value, e.g. "Kč". */
  unit?: string | undefined;
  /** A line under the amount, e.g. "≈ 2 431 sat". */
  secondary?: string | undefined;
  /** Dims the value while it is still the empty placeholder, e.g. "0". */
  placeholder?: boolean | undefined;
  size?: "md" | "lg" | undefined;
  /** Announces changes to assistive technology, for an amount being typed. */
  live?: boolean | undefined;
  testID?: string | undefined;
}

/** Long amounts step down a size, so the figure stays on one line on a phone. */
const amountVariant = (
  value: string,
  size: "md" | "lg",
): Extract<TextVariant, "amount" | "display" | "heading"> =>
  size === "md"
    ? value.length > 12
      ? "heading"
      : "display"
    : value.length > 13
      ? "heading"
      : value.length > 9
        ? "display"
        : "amount";

export function AmountDisplay({
  value,
  unit,
  secondary,
  placeholder = false,
  size = "lg",
  live = false,
  testID,
}: AmountDisplayProps) {
  const variant = amountVariant(value, size);
  return (
    <Stack
      testID={testID}
      gap="$xs"
      alignItems="center"
      aria-live={live ? "polite" : undefined}
    >
      <Row gap="$sm" alignItems="baseline" justifyContent="center">
        <Text
          variant={variant}
          fontVariant={["tabular-nums"]}
          color={placeholder ? "$placeholderColor" : "$colorStrong"}
          textAlign="center"
          numberOfLines={1}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            variant={variant === "amount" ? "heading" : "title"}
            bold
            color="$colorMuted"
          >
            {unit}
          </Text>
        ) : null}
      </Row>
      {secondary ? (
        <Text
          variant="label"
          muted
          fontVariant={["tabular-nums"]}
          textAlign="center"
        >
          {secondary}
        </Text>
      ) : null}
    </Stack>
  );
}
