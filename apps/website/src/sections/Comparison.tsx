import { Card, Icon, Row, Stack, Text, useMedia } from "@platitprosim/ui";
import { border } from "@platitprosim/ui/tokens";
import type { ComparisonRow } from "../copy";
import { useSite } from "../site/site";
import { Reveal, SectionHeading, SiteSection } from "./parts";
import { sectionIds } from "./sectionIds";

function Cell({ text, ours }: { text: string; ours: boolean }) {
  return (
    <Row
      flex={1}
      flexBasis={0}
      gap="$sm"
      paddingHorizontal="$lg"
      paddingVertical="$lg"
      backgroundColor={ours ? "$accentSoft" : "$transparent"}
    >
      <Icon
        name={ours ? "CircleCheck" : "CircleX"}
        size="sm"
        color={ours ? "$accent" : "$colorMuted"}
      />
      <Text
        flex={1}
        variant="label"
        fontWeight={ours ? "$bold" : "$regular"}
        color={ours ? "$colorStrong" : "$colorMuted"}
      >
        {text}
      </Text>
    </Row>
  );
}

function TableRow({ row, wide }: { row: ComparisonRow; wide: boolean }) {
  const cells = (
    <>
      <Cell text={row.cardTerminal} ours={false} />
      <Cell text={row.platitProsim} ours />
    </>
  );
  return (
    <Stack
      gap="$none"
      borderTopWidth={border.hairline}
      borderColor="$borderColor"
    >
      {wide ? (
        <Row gap="$none" alignItems="stretch">
          <Text
            flex={1}
            flexBasis={0}
            alignSelf="center"
            padding="$lg"
            fontWeight="$semibold"
          >
            {row.label}
          </Text>
          {cells}
        </Row>
      ) : (
        <>
          <Text eyebrow paddingHorizontal="$lg" paddingTop="$lg">
            {row.label}
          </Text>
          <Row gap="$none" alignItems="stretch">
            {cells}
          </Row>
        </>
      )}
    </Stack>
  );
}

export function Comparison() {
  const { copy } = useSite();
  const { wide } = useMedia();
  const comparison = copy.comparison;
  return (
    <SiteSection id={sectionIds.comparison}>
      <Reveal>
        <SectionHeading
          eyebrow={comparison.eyebrow}
          title={comparison.title}
          body={comparison.body}
        />
      </Reveal>
      <Reveal>
        <Stack gap="$lg">
          <Card padding="$none" gap="$none" overflow="hidden">
            <Row gap="$none" alignItems="stretch">
              {wide ? <Stack flex={1} flexBasis={0} /> : null}
              <Text flex={1} flexBasis={0} padding="$lg" variant="title" muted>
                {comparison.cardTerminal}
              </Text>
              <Row
                flex={1}
                flexBasis={0}
                gap="$sm"
                padding="$lg"
                backgroundColor="$accentSoft"
              >
                <Text variant="title" color="$accentText">
                  {comparison.platitProsim}
                </Text>
              </Row>
            </Row>
            {comparison.rows.map((row) => (
              <TableRow key={row.label} row={row} wide={wide} />
            ))}
          </Card>
          <Text variant="label" muted>
            {comparison.note}
          </Text>
        </Stack>
      </Reveal>
    </SiteSection>
  );
}
