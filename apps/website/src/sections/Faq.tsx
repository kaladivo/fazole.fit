import { Card, Icon, Pressable, Stack, Text } from "@platitprosim/ui";
import { border } from "@platitprosim/ui/tokens";
import { useId, useState } from "react";
import type { FaqItem } from "../copy";
import { useSite } from "../site/site";
import { Reveal, SectionHeading, SiteSection } from "./parts";
import { sectionIds } from "./sectionIds";

function Question({ item, first }: { item: FaqItem; first: boolean }) {
  const [open, setOpen] = useState(false);
  const answerId = useId();
  return (
    <Stack
      gap="$none"
      borderTopWidth={first ? 0 : border.hairline}
      borderColor="$borderColor"
    >
      <Pressable
        aria-expanded={open}
        aria-controls={answerId}
        onPress={() => setOpen(!open)}
        justifyContent="space-between"
        gap="$lg"
        paddingVertical="$xl"
        paddingHorizontal="$xl"
        hoverStyle={{ backgroundColor: "$neutralSoft" }}
      >
        <Text flex={1} variant="title" color="$colorStrong">
          {item.question}
        </Text>
        <Stack rotate={open ? "180deg" : "0deg"} transition="base">
          <Icon name="ChevronDown" color="$colorMuted" />
        </Stack>
      </Pressable>
      {open ? (
        <Text
          id={answerId}
          muted
          paddingHorizontal="$xl"
          paddingBottom="$xl"
          transition="base"
          enterStyle={{ opacity: 0, y: -8 }}
        >
          {item.answer}
        </Text>
      ) : null}
    </Stack>
  );
}

export function Faq() {
  const { copy } = useSite();
  const faq = copy.faq;
  return (
    <SiteSection id={sectionIds.faq}>
      <Reveal>
        <SectionHeading eyebrow={faq.eyebrow} title={faq.title} centered />
      </Reveal>
      <Reveal>
        <Card
          padding="$none"
          gap="$none"
          overflow="hidden"
          width="100%"
          maxWidth="$contentWidth"
          alignSelf="center"
        >
          {faq.items.map((item, index) => (
            <Question key={item.question} item={item} first={index === 0} />
          ))}
        </Card>
      </Reveal>
    </SiteSection>
  );
}
