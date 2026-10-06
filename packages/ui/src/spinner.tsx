import { ActivityIndicator } from "react-native";
import { getVariableValue, useTheme } from "tamagui";
import type { ColorTokens } from "tamagui";

export interface SpinnerProps {
  size?: "sm" | "lg" | undefined;
  color?: ColorTokens | undefined;
  accessibilityLabel?: string | undefined;
}

export function Spinner({
  size = "sm",
  color = "$accent",
  accessibilityLabel,
}: SpinnerProps) {
  const themed = useTheme()[color.slice(1)];
  return (
    <ActivityIndicator
      size={size === "sm" ? "small" : "large"}
      color={themed ? getVariableValue(themed) : color}
      role="progressbar"
      aria-label={accessibilityLabel}
    />
  );
}
