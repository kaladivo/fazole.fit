import { Card, Icon, Pill, Row, Stack, Text, useMedia } from "@platitprosim/ui";
import type { IconName, Tone } from "@platitprosim/ui";
import { useSite } from "../site/site";
import { IconTile, Reveal, SectionHeading, SiteSection } from "./parts";
import { sectionIds } from "./sectionIds";

function MethodCard({
  icon,
  title,
  pill,
  tone,
  body,
}: {
  icon: IconName;
  title: string;
  pill: string;
  tone: Tone;
  body: string;
}) {
  const { wide } = useMedia();
  return (
    <Card flex={wide ? 1 : undefined} gap="$lg" padding="$xxl">
      <Row justifyContent="space-between" flexWrap="wrap">
        <Row gap="$md">
          <Icon name={icon} size="lg" color="$accent" />
          <Text variant="heading" color="$colorStrong">
            {title}
          </Text>
        </Row>
        <Pill label={pill} tone={tone} dot />
      </Row>
      <Text muted>{body}</Text>
    </Card>
  );
}

export function HowItWorks() {
  const { copy } = useSite();
  const { wide } = useMedia();
  const how = copy.how;
  const Columns = wide ? Row : Stack;
  return (
    <SiteSection id={sectionIds.howItWorks}>
      <Reveal>
        <SectionHeading eyebrow={how.eyebrow} title={how.title} />
      </Reveal>
      <Reveal>
        <Columns gap="$lg" alignItems="stretch">
          {how.steps.map((step, index) => (
            <Card
              key={step.title}
              flex={wide ? 1 : undefined}
              gap="$lg"
              padding="$xxl"
            >
              <Row justifyContent="space-between">
                <IconTile icon={step.icon} />
                <Text variant="display" color="$borderColorHover">
                  {index + 1}
                </Text>
              </Row>
              <Stack gap="$xs">
                <Text variant="title" color="$colorStrong">
                  {step.title}
                </Text>
                <Text muted>{step.body}</Text>
              </Stack>
            </Card>
          ))}
        </Columns>
      </Reveal>
      <Reveal>
        <Columns gap="$lg" alignItems="stretch">
          <MethodCard icon="Landmark" tone="info" {...how.bank} />
          <MethodCard icon="Bitcoin" tone="success" {...how.bitcoin} />
        </Columns>
      </Reveal>
    </SiteSection>
  );
}
