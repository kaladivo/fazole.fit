import type { ReactNode } from "react";
import {
  ScrollView,
  Separator,
  styled,
  Text as TamaguiText,
  XStack,
  YStack,
} from "tamagui";
import { textVariant } from "./styles";
import { border, letterSpacing, shadow } from "./tokens";

export const Stack = styled(YStack, { name: "Stack", gap: "$md", minWidth: 0 });

export const Row = styled(XStack, {
  name: "Row",
  gap: "$md",
  alignItems: "center",
  minWidth: 0,
});

export const Text = styled(TamaguiText, {
  name: "Text",
  fontFamily: "$body",
  color: "$color",
  // Web buttons center their text; rows and labels read from the start.
  textAlign: "left",
  ...textVariant("body"),
  variants: {
    variant: {
      caption: textVariant("caption"),
      label: textVariant("label"),
      body: textVariant("body"),
      title: textVariant("title"),
      heading: textVariant("heading"),
      display: {
        ...textVariant("display"),
        letterSpacing: letterSpacing.display,
      },
      amount: {
        ...textVariant("amount"),
        letterSpacing: letterSpacing.amount,
      },
    },
    muted: { true: { color: "$colorMuted" } },
    bold: { true: { fontWeight: "$bold" } },
    mono: { true: { fontFamily: "$mono" } },
    eyebrow: {
      true: {
        ...textVariant("caption"),
        fontWeight: "$bold",
        letterSpacing: letterSpacing.eyebrow,
        textTransform: "uppercase",
        color: "$colorMuted",
      },
    },
  } as const,
});

export const Card = styled(YStack, {
  name: "Card",
  gap: "$md",
  padding: "$xl",
  borderRadius: "$card",
  backgroundColor: "$surface",
  borderWidth: border.hairline,
  borderColor: "$borderColor",
  minWidth: 0,
  variants: {
    elevated: { true: { boxShadow: shadow.floating } },
    flat: { true: { borderWidth: 0 } },
    tone: {
      accent: { backgroundColor: "$accentSoft", borderWidth: 0 },
    },
  } as const,
});

export const Divider = styled(Separator, {
  name: "Divider",
  borderColor: "$borderColor",
});

const screenWidths = {
  narrow: "$narrowWidth",
  content: "$contentWidth",
  wide: "$appWidth",
} as const;

export interface ScreenProps {
  children: ReactNode;
  /** The column's max width: `narrow` (480) for the terminal and forms, `content` (720) for lists. */
  width?: keyof typeof screenWidths | undefined;
  /** Scrolls the column; turn off for screens that lay out to the viewport, such as the terminal. */
  scroll?: boolean | undefined;
  /** Centers the content vertically, e.g. for welcome and empty screens. */
  centered?: boolean | undefined;
  testID?: string | undefined;
}

/** A page body: a centred column with the app gutter, scrollable by default. */
export function Screen({
  children,
  width = "content",
  scroll = true,
  centered = false,
  testID,
}: ScreenProps) {
  const column = (
    <YStack
      testID={scroll ? undefined : testID}
      flexGrow={1}
      flexShrink={1}
      width="100%"
      maxWidth={screenWidths[width]}
      alignSelf="center"
      gap="$xl"
      paddingHorizontal="$xl"
      paddingTop="$lg"
      paddingBottom="$xxl"
      justifyContent={centered ? "center" : "flex-start"}
      minHeight={0}
    >
      {children}
    </YStack>
  );
  return scroll ? (
    <ScrollView
      testID={testID}
      flex={1}
      backgroundColor="$background"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      {column}
    </ScrollView>
  ) : (
    <YStack flex={1} minHeight={0} backgroundColor="$background">
      {column}
    </YStack>
  );
}

export interface SectionProps {
  title?: string | undefined;
  /** Sits at the end of the title row, e.g. a small action. */
  trailing?: ReactNode;
  children: ReactNode;
}

export function Section({ title, trailing, children }: SectionProps) {
  return (
    <Stack gap="$sm">
      {title || trailing ? (
        <Row justifyContent="space-between" minHeight="$controlSm">
          {title ? (
            <Text eyebrow role="heading">
              {title}
            </Text>
          ) : null}
          {trailing}
        </Row>
      ) : null}
      {children}
    </Stack>
  );
}

export { ScrollView, Spacer } from "tamagui";
