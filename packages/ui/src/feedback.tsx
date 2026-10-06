import type { ReactNode } from "react";
import { View } from "tamagui";
import { Button, IconButton } from "./controls";
import type { LabeledAction } from "./controls";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import { Row, Stack, Text } from "./layout";
import { toneColors, toneIcons } from "./styles";
import type { Tone } from "./tokens";
import { border, enterScale, shadow, space } from "./tokens";

export interface NoticeProps {
  title: string;
  description?: string | undefined;
  tone?: Tone | undefined;
  icon?: IconName | undefined;
  action?: LabeledAction | undefined;
  /** Shows a close button; `label` is its accessibility label. */
  dismiss?: LabeledAction | undefined;
}

/** An inline message about the screen's state, with an optional action under the text. */
export function Notice({
  title,
  description,
  tone = "info",
  icon,
  action,
  dismiss,
}: NoticeProps) {
  const colors = toneColors[tone];
  return (
    <Row
      alignItems="flex-start"
      gap="$md"
      padding="$lg"
      borderRadius="$control"
      backgroundColor={colors.background}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon name={icon ?? toneIcons[tone]} color={colors.color} />
      <Stack flex={1} gap="$xs">
        <Text variant="label" color={colors.color}>
          {title}
        </Text>
        {description ? (
          <Text variant="label" fontWeight="$regular" color="$colorSubtle">
            {description}
          </Text>
        ) : null}
        {action ? (
          <Button
            size="sm"
            variant="secondary"
            alignSelf="flex-start"
            marginTop="$xs"
            onPress={action.onPress}
          >
            {action.label}
          </Button>
        ) : null}
      </Stack>
      {dismiss ? (
        <IconButton
          icon="X"
          accessibilityLabel={dismiss.label}
          size="sm"
          marginTop={-space.sm}
          marginRight={-space.sm}
          onPress={dismiss.onPress}
        />
      ) : null}
    </Row>
  );
}

export interface ToastProps {
  title: string;
  tone?: Tone | undefined;
  action?: LabeledAction | undefined;
}

/** A short confirmation, e.g. "Copied"; place it in a `ToastStack`. */
export function Toast({ title, tone = "neutral", action }: ToastProps) {
  return (
    <Row
      role="status"
      gap="$md"
      paddingLeft="$lg"
      paddingRight={action ? "$sm" : "$lg"}
      paddingVertical="$sm"
      minHeight="$control"
      maxWidth="$sheetWidth"
      borderRadius="$pill"
      borderWidth={border.hairline}
      borderColor="$borderColor"
      backgroundColor="$surface"
      boxShadow={shadow.floating}
      transition="base"
      enterStyle={{ opacity: 0, y: -space.lg, scale: enterScale.subtle }}
    >
      {tone === "neutral" ? null : (
        <Icon name={toneIcons[tone]} size="sm" color={toneColors[tone].solid} />
      )}
      <Text variant="label" flexShrink={1}>
        {title}
      </Text>
      {action ? (
        <Button size="sm" variant="ghost" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </Row>
  );
}

/** Positions toasts centred at the top edge, above every overlay. */
export function ToastStack({ children }: { children: ReactNode }) {
  return (
    <Stack
      position="absolute"
      top="$lg"
      right="$lg"
      left="$lg"
      alignItems="center"
      gap="$sm"
      zIndex="$toast"
      pointerEvents="box-none"
      aria-live="polite"
    >
      {children}
    </Stack>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string | undefined;
  icon?: IconName | undefined;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <Stack
      alignItems="center"
      gap="$md"
      paddingVertical="$xxxl"
      paddingHorizontal="$xl"
    >
      {icon ? (
        <View
          width="$controlLg"
          height="$controlLg"
          alignItems="center"
          justifyContent="center"
          borderRadius="$card"
          backgroundColor="$accentSoft"
          marginBottom="$xs"
        >
          <Icon name={icon} size="lg" color="$accentText" />
        </View>
      ) : null}
      <Text variant="title" textAlign="center">
        {title}
      </Text>
      {description ? (
        <Text muted textAlign="center" maxWidth="$narrowWidth">
          {description}
        </Text>
      ) : null}
      {action ? <Stack marginTop="$sm">{action}</Stack> : null}
    </Stack>
  );
}
