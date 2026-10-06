import { useMedia } from "tamagui";
import { Row, Stack, Text } from "./layout";
import { border } from "./tokens";

export interface MnemonicGridProps {
  /** The phrase, one entry per word. */
  words: readonly string[];
  accessibilityLabel: string;
  /** The accessible name of a cell, e.g. `(n) => "Word " + n`. */
  wordLabel: (position: number) => string;
  /** Masks every word, so the phrase can sit on screen until the user asks to see it. */
  hidden?: boolean | undefined;
  /** Defaults to 2 on phones and 3 on wide screens. */
  columns?: 2 | 3 | undefined;
}

const MASK = "••••";

const chunk = <T,>(items: readonly T[], length: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / length) }, (_, index) =>
    items.slice(index * length, index * length + length),
  );

/** A numbered grid of backup words, masked until the user reveals them. */
export function MnemonicGrid({
  words,
  accessibilityLabel,
  wordLabel,
  hidden = false,
  columns,
}: MnemonicGridProps) {
  const { wide } = useMedia();
  const rows = chunk(
    words.map((word, index) => ({ word, index })),
    columns ?? (wide ? 3 : 2),
  );
  return (
    <Stack role="group" aria-label={accessibilityLabel} gap="$sm">
      {rows.map((row) => (
        <Row key={row[0]?.index} gap="$sm">
          {row.map(({ word, index }) => (
            <Row
              key={index}
              flex={1}
              flexBasis={0}
              gap="$xs"
              minHeight="$control"
              paddingHorizontal="$sm"
              borderRadius="$control"
              borderWidth={border.hairline}
              borderColor="$borderColor"
              backgroundColor="$surface"
            >
              <Text
                variant="caption"
                muted
                fontVariant={["tabular-nums"]}
                minWidth="$iconSm"
                textAlign="right"
                aria-hidden
              >
                {index + 1}
              </Text>
              <Text
                variant="label"
                color={hidden ? "$colorMuted" : "$colorStrong"}
                numberOfLines={1}
                aria-label={
                  hidden
                    ? wordLabel(index + 1)
                    : `${wordLabel(index + 1)}: ${word}`
                }
              >
                {hidden ? MASK : word}
              </Text>
            </Row>
          ))}
        </Row>
      ))}
    </Stack>
  );
}
