import { Input, useMedia } from "tamagui";
import { Row, Stack, Text } from "./layout";
import { fillWords } from "./mnemonic-words";
import { focusRing, textVariant } from "./styles";
import { border } from "./tokens";

export interface MnemonicGridProps {
  /** The phrase, one entry per word; editable cells may hold "". */
  words: readonly string[];
  accessibilityLabel: string;
  /** Makes the grid editable; pasting a whole phrase into any cell fills the cells from there on. */
  onWordsChange?: ((words: string[]) => void) | undefined;
  /** The accessible name of a cell, e.g. `(n) => "Word " + n`. */
  wordLabel: (position: number) => string;
  /** Indexes of words to mark as wrong, e.g. not in the BIP-39 list. */
  invalid?: readonly number[] | undefined;
  /** Defaults to 2 on phones and 3 on wide screens. */
  columns?: 2 | 3 | undefined;
}

const chunk = <T,>(items: readonly T[], length: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / length) }, (_, index) =>
    items.slice(index * length, index * length + length),
  );

/** A numbered grid of backup words, shown to write down or filled in to restore. */
export function MnemonicGrid({
  words,
  accessibilityLabel,
  onWordsChange,
  wordLabel,
  invalid = [],
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
          {row.map(({ word, index }) => {
            const wrong = invalid.includes(index);
            return (
              <Row
                key={index}
                flex={1}
                flexBasis={0}
                gap="$xs"
                minHeight="$control"
                paddingLeft="$sm"
                paddingRight={onWordsChange ? "$none" : "$sm"}
                borderRadius="$control"
                borderWidth={border.hairline}
                borderColor={wrong ? "$danger" : "$borderColor"}
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
                {onWordsChange ? (
                  <Input
                    unstyled
                    flex={1}
                    minWidth={0}
                    height="$control"
                    paddingHorizontal="$xs"
                    borderRadius="$control"
                    fontFamily="$body"
                    {...textVariant("label")}
                    color={wrong ? "$dangerText" : "$colorStrong"}
                    focusVisibleStyle={focusRing}
                    aria-label={wordLabel(index + 1)}
                    aria-invalid={wrong}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                    value={word}
                    onChangeText={(text) =>
                      onWordsChange(fillWords(words, index, text))
                    }
                  />
                ) : (
                  <Text
                    variant="label"
                    color="$colorStrong"
                    numberOfLines={1}
                    aria-label={`${wordLabel(index + 1)}: ${word}`}
                  >
                    {word}
                  </Text>
                )}
              </Row>
            );
          })}
        </Row>
      ))}
    </Stack>
  );
}
