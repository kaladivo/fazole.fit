import type { ReactNode } from "react";
import { View } from "tamagui";
import { Icon } from "./icons";
import { Stack, Text } from "./layout";
import { border } from "./tokens";

export interface ScannerFrameProps {
  /** The camera picture, filling the frame; without it the frame shows a placeholder. */
  children?: ReactNode;
  /** A line under the frame, e.g. "Point the camera at a Linky profile QR". */
  hint?: string | undefined;
  /** Turns the corners green once a code is read. */
  detected?: boolean | undefined;
  accessibilityLabel: string;
}

const corners = [
  {
    top: 0,
    left: 0,
    borderTopWidth: border.scanner,
    borderLeftWidth: border.scanner,
    borderTopLeftRadius: "$card",
  },
  {
    top: 0,
    right: 0,
    borderTopWidth: border.scanner,
    borderRightWidth: border.scanner,
    borderTopRightRadius: "$card",
  },
  {
    bottom: 0,
    left: 0,
    borderBottomWidth: border.scanner,
    borderLeftWidth: border.scanner,
    borderBottomLeftRadius: "$card",
  },
  {
    bottom: 0,
    right: 0,
    borderBottomWidth: border.scanner,
    borderRightWidth: border.scanner,
    borderBottomRightRadius: "$card",
  },
] as const;

/** A square viewfinder with corner marks; the app renders the camera inside it. */
export function ScannerFrame({
  children,
  hint,
  detected = false,
  accessibilityLabel,
}: ScannerFrameProps) {
  return (
    <Stack alignItems="center" gap="$lg">
      <View
        role="img"
        aria-label={accessibilityLabel}
        width="100%"
        maxWidth="$scanner"
        aspectRatio={1}
        position="relative"
      >
        <View
          position="absolute"
          inset="$sm"
          borderRadius="$sm"
          overflow="hidden"
          backgroundColor="$scannerBackground"
          alignItems="center"
          justifyContent="center"
        >
          {children ?? <Icon name="ScanLine" size="xl" color="$colorMuted" />}
        </View>
        {corners.map((corner, index) => (
          <View
            key={index}
            position="absolute"
            width="$controlLg"
            height="$controlLg"
            borderColor={detected ? "$success" : "$accent"}
            transition="base"
            {...corner}
          />
        ))}
      </View>
      {hint ? (
        <Text muted textAlign="center">
          {hint}
        </Text>
      ) : null}
    </Stack>
  );
}
