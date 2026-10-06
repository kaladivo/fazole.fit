import {
  Button,
  Icon,
  Pill,
  Row,
  Stack,
  Text,
  useMedia,
} from "@platitprosim/ui";
import type { IconName } from "@platitprosim/ui";
import { siteConfig } from "../config";
import { DemoApp } from "../demo/DemoApp";
import { useSite } from "../site/site";
import { Glow } from "./parts";
import { sectionIds } from "./sectionIds";

const methodIcons: IconName[] = ["Landmark", "Zap", "Bitcoin"];

function DemoHint() {
  const { hero } = useSite().copy;
  const { wide } = useMedia();
  return (
    <Row
      gap="$sm"
      flexWrap="wrap"
      justifyContent={wide ? "flex-start" : "center"}
    >
      <Pill label={hero.demoLabel} tone="success" dot />
      <Text variant="label" muted>
        {hero.demoHint}
      </Text>
    </Row>
  );
}

export function Hero() {
  const { copy } = useSite();
  const { wide } = useMedia();
  const hero = copy.hero;
  const Columns = wide ? Row : Stack;
  const titleVariant = wide ? "amount" : "display";
  return (
    <Columns
      gap={wide ? "$huge" : "$xxxl"}
      alignItems="center"
      paddingTop={wide ? "$huge" : "$xxl"}
      paddingBottom="$huge"
    >
      <Stack
        flex={wide ? 1 : undefined}
        width="100%"
        gap="$xxl"
        transition="slow"
        enterStyle={{ opacity: 0, y: 24 }}
      >
        <Pill label={hero.eyebrow} tone="accent" icon="Smartphone" />
        <Text
          variant={titleVariant}
          color="$colorStrong"
          role="heading"
          aria-level={1}
        >
          {hero.titleBefore}
          <Text variant={titleVariant} color="$accent">
            {hero.titleAccent}
          </Text>
          {hero.titleAfter}
        </Text>
        <Text
          variant="title"
          fontWeight="$regular"
          color="$colorMuted"
          maxWidth="$sheetWidth"
        >
          {hero.subtitle}
        </Text>
        <Columns gap="$sm" alignItems="stretch">
          <Button
            render={<a href={siteConfig.webAppUrl} />}
            role="link"
            size="lg"
            icon="Smartphone"
          >
            {hero.primaryCta}
          </Button>
          <Button
            render={<a href={`#${sectionIds.howItWorks}`} />}
            role="link"
            size="lg"
            variant="secondary"
          >
            {hero.secondaryCta}
          </Button>
        </Columns>
        <Row gap="$xl" flexWrap="wrap">
          {hero.methods.map((method, index) => (
            <Row key={method} gap="$xs">
              <Icon
                name={methodIcons[index] ?? "QrCode"}
                size="sm"
                color="$colorMuted"
              />
              <Text variant="label" muted>
                {method}
              </Text>
            </Row>
          ))}
        </Row>
        {wide ? <DemoHint /> : null}
      </Stack>
      <Stack
        flex={wide ? 1 : undefined}
        width="100%"
        position="relative"
        alignItems="center"
        gap="$lg"
        transition={["slow", { delay: 150 }]}
        enterStyle={{ opacity: 0, y: 40 }}
      >
        <Glow />
        {wide ? null : <DemoHint />}
        <DemoApp
          initialTab="terminal"
          accessibilityLabel={copy.demo.terminalDemo}
          maxWidth={wide ? 330 : 360}
        />
      </Stack>
    </Columns>
  );
}
