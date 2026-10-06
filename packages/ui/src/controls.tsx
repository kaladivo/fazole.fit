import type { ReactNode } from "react";
import { Button as TamaguiButton } from "tamagui";
import type { ColorTokens, GetProps } from "tamagui";
import { Icon } from "./icons";
import type { IconName, IconSize } from "./icons";
import { Row, Text } from "./layout";
import { Spinner } from "./spinner";
import { focusRing, tooltipProps } from "./styles";
import type { TextVariant } from "./tokens";
import { opacity, shadow } from "./tokens";

export type PressableProps = GetProps<typeof TamaguiButton> & {
  /** A browser tooltip on the web; ignored on native. */
  tooltip?: string | undefined;
};

/** An unstyled, focusable press target; every pressable in the library builds on it. */
export function Pressable({ disabled, tooltip, ...props }: PressableProps) {
  return (
    <TamaguiButton
      unstyled
      // Unlike its default JSX element, a string element gets the native `disabled`, which also blocks keys and form submits.
      render="button"
      type="button"
      flexDirection="row"
      alignItems="center"
      cursor="pointer"
      backgroundColor="$transparent"
      borderWidth={0}
      padding="$none"
      focusVisibleStyle={focusRing}
      disabledStyle={{ opacity: opacity.disabled, cursor: "default" }}
      disabled={disabled}
      // Tamagui's disabled button ignores the pointer, which would hide its tooltip.
      pointerEvents="auto"
      {...tooltipProps(tooltip)}
      {...props}
    />
  );
}

/** A labelled callback, rendered as a button by the component that takes it. */
export interface LabeledAction {
  label: string;
  onPress: () => void;
}

const buttonVariants = {
  primary: {
    background: "$accent",
    hover: "$accentHover",
    press: "$accentPress",
    color: "$onAccent",
  },
  secondary: {
    background: "$surface",
    hover: "$surfacePress",
    press: "$surfacePress",
    color: "$color",
  },
  ghost: {
    background: "$transparent",
    hover: "$neutralSoft",
    press: "$neutralSoft",
    color: "$colorSubtle",
  },
  danger: {
    background: "$dangerSoft",
    hover: "$dangerSoft",
    press: "$dangerSoft",
    color: "$dangerText",
  },
} satisfies Record<
  string,
  {
    background: ColorTokens;
    hover: ColorTokens;
    press: ColorTokens;
    color: ColorTokens;
  }
>;

export type ButtonVariant = keyof typeof buttonVariants;

const buttonSizes = {
  sm: {
    height: "$controlSm",
    padding: "$md",
    radius: "$pill",
    text: "caption",
    icon: "sm",
  },
  md: {
    height: "$control",
    padding: "$xl",
    radius: "$control",
    text: "label",
    icon: "md",
  },
  lg: {
    height: "$controlLg",
    padding: "$xxl",
    radius: "$control",
    text: "title",
    icon: "lg",
  },
} as const satisfies Record<
  string,
  {
    height: `$${string}`;
    padding: `$${string}`;
    radius: `$${string}`;
    text: TextVariant;
    icon: IconSize;
  }
>;

export interface ButtonProps extends Omit<
  PressableProps,
  "children" | "icon" | "size" | "variant"
> {
  children?: ReactNode;
  variant?: ButtonVariant | undefined;
  /** `lg` is the screen's main action, e.g. "Request payment". */
  size?: keyof typeof buttonSizes | undefined;
  icon?: IconName | undefined;
  loading?: boolean | undefined;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const colors = buttonVariants[variant];
  const dimensions = buttonSizes[size];
  return (
    <Pressable
      justifyContent="center"
      gap="$sm"
      minHeight={dimensions.height}
      paddingHorizontal={dimensions.padding}
      borderRadius={dimensions.radius}
      backgroundColor={colors.background}
      borderWidth={variant === "secondary" ? 1 : 0}
      borderColor="$borderColor"
      hoverStyle={{ backgroundColor: colors.hover }}
      pressStyle={{
        backgroundColor: colors.press,
        opacity: opacity.dimmed,
        scale: 0.98,
      }}
      transition="fast"
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Spinner color={colors.color} />
      ) : icon ? (
        <Icon name={icon} size={dimensions.icon} color={colors.color} />
      ) : null}
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          variant={dimensions.text}
          bold
          color={colors.color}
          textAlign="center"
          numberOfLines={1}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export interface IconButtonProps extends Omit<
  ButtonProps,
  "children" | "icon" | "size" | "aria-label"
> {
  icon: IconName;
  accessibilityLabel: string;
  size?: "sm" | "md" | "lg" | undefined;
}

const iconButtonSizes = {
  sm: { box: "$controlSm", icon: "sm" },
  md: { box: "$control", icon: "md" },
  lg: { box: "$controlLg", icon: "lg" },
} as const satisfies Record<string, { box: `$${string}`; icon: IconSize }>;

export function IconButton({
  icon,
  accessibilityLabel,
  variant = "ghost",
  size = "md",
  loading = false,
  disabled,
  tooltip = accessibilityLabel,
  ...props
}: IconButtonProps) {
  const colors = buttonVariants[variant];
  const dimensions = iconButtonSizes[size];
  const color = variant === "ghost" ? "$color" : colors.color;
  return (
    <Pressable
      aria-label={accessibilityLabel}
      tooltip={tooltip}
      justifyContent="center"
      width={dimensions.box}
      height={dimensions.box}
      flexShrink={0}
      borderRadius="$pill"
      backgroundColor={colors.background}
      borderWidth={variant === "secondary" ? 1 : 0}
      borderColor="$borderColor"
      hoverStyle={{ backgroundColor: colors.hover }}
      pressStyle={{ backgroundColor: colors.press, opacity: opacity.dimmed }}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Spinner color={color} />
      ) : (
        <Icon name={icon} size={dimensions.icon} color={color} />
      )}
    </Pressable>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName | undefined;
  disabled?: boolean | undefined;
}

export interface SegmentedControlProps<T extends string> {
  accessibilityLabel: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onValueChange: (value: T) => void;
  /** `lg` for a screen-level switch such as Bank | Bitcoin. */
  size?: "md" | "lg" | undefined;
}

export function SegmentedControl<T extends string>({
  accessibilityLabel,
  value,
  options,
  onValueChange,
  size = "md",
}: SegmentedControlProps<T>) {
  const large = size === "lg";
  return (
    <Row
      role="radiogroup"
      aria-label={accessibilityLabel}
      gap="$xs"
      padding="$xs"
      borderRadius="$pill"
      backgroundColor="$neutralSoft"
    >
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? "$colorStrong" : "$colorMuted";
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onPress={() => onValueChange(option.value)}
            flex={1}
            justifyContent="center"
            gap="$sm"
            minHeight={large ? "$control" : "$controlSm"}
            paddingHorizontal="$md"
            borderRadius="$pill"
            backgroundColor={selected ? "$surfaceRaised" : "$transparent"}
            {...(selected ? { boxShadow: shadow.raised } : {})}
            hoverStyle={selected ? {} : { backgroundColor: "$neutralSoft" }}
            transition="fast"
          >
            {option.icon ? (
              <Icon name={option.icon} size="sm" color={color} />
            ) : null}
            <Text
              variant={large ? "label" : "caption"}
              bold
              color={color}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}
