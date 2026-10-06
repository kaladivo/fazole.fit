import { Row, Stack, Text, Theme } from "@platitprosim/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import { useSite } from "../site/site";

// Screens are laid out at a real phone's CSS size, then scaled to the frame.
const screen = { width: 390, height: 844 };

function StatusBar() {
  return (
    <Row
      height="$control"
      flexShrink={0}
      justifyContent="space-between"
      paddingHorizontal="$xxxl"
      backgroundColor="$background"
    >
      <Text variant="label" bold color="$colorStrong">
        9:41
      </Text>
      <Row
        position="absolute"
        top="$sm"
        left={0}
        right={0}
        justifyContent="center"
        pointerEvents="none"
      >
        <Stack
          width="$hero"
          height="$controlSm"
          borderRadius="$pill"
          backgroundColor="$qrForeground"
        />
      </Row>
      <Row gap="$xxs" alignItems="center">
        <Stack
          width="$iconLg"
          height="$sm"
          padding="$xxs"
          borderRadius={3}
          borderWidth={1}
          borderColor="$colorMuted"
        >
          <Stack flex={1} borderRadius={1} backgroundColor="$colorStrong" />
        </Stack>
      </Row>
    </Row>
  );
}

function HomeIndicator() {
  return (
    <Row
      position="absolute"
      left={0}
      right={0}
      bottom="$sm"
      justifyContent="center"
      pointerEvents="none"
    >
      <Stack
        width="35%"
        height="$track"
        borderRadius="$pill"
        backgroundColor="$colorStrong"
      />
    </Row>
  );
}

export interface PhoneFrameProps {
  /** Names the phone for assistive technology, e.g. "Live terminal demo". */
  accessibilityLabel: string;
  /** The frame's widest size; it shrinks with its column. */
  maxWidth: number;
  children: ReactNode;
}

/** A phone around a live, phone-sized app screen, scaled to the frame's width. */
export function PhoneFrame({
  accessibilityLabel,
  maxWidth,
  children,
}: PhoneFrameProps) {
  const { mode } = useSite();
  const [scale, setScale] = useState(0);
  return (
    <Theme name="dark">
      <Stack
        role="group"
        aria-label={accessibilityLabel}
        width="100%"
        maxWidth={maxWidth}
        alignSelf="center"
        padding="$sm"
        borderRadius={48}
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColorHover"
        boxShadow="0px 32px 64px -16px $shadowColor"
      >
        <Theme name={mode}>
          <Stack
            position="relative"
            aspectRatio={screen.width / screen.height}
            overflow="hidden"
            borderRadius={40}
            backgroundColor="$background"
            onLayout={(event) =>
              setScale(event.nativeEvent.layout.width / screen.width)
            }
          >
            <Stack
              position="absolute"
              top={0}
              left={0}
              width={screen.width}
              height={screen.height}
              scale={scale}
              transformOrigin="left top"
              gap="$none"
              backgroundColor="$background"
            >
              <StatusBar />
              <Stack flex={1} gap="$none" minHeight={0}>
                {children}
              </Stack>
              <HomeIndicator />
            </Stack>
          </Stack>
        </Theme>
      </Stack>
    </Theme>
  );
}
