import { Card, Icon, Pill, Row, Stack, Text } from "@platitprosim/ui";
import type { IconName } from "@platitprosim/ui";
import { DemoApp } from "../demo/DemoApp";
import { useSite } from "../site/site";
import {
  IconTile,
  PointList,
  Reveal,
  SectionHeading,
  Showcase,
  SiteSection,
} from "./parts";
import { sectionIds } from "./sectionIds";

const phoneWidth = 320;

export function HistoryFeature() {
  const { copy } = useSite();
  const history = copy.history;
  return (
    <SiteSection id={sectionIds.history}>
      <Reveal>
        <Showcase
          phoneFirst
          text={
            <>
              <SectionHeading
                eyebrow={history.eyebrow}
                title={history.title}
                body={history.body}
              />
              <PointList points={history.points} />
            </>
          }
          phone={
            <DemoApp
              initialTab="history"
              accessibilityLabel={copy.demo.historyDemo}
              maxWidth={phoneWidth}
            />
          }
        />
      </Reveal>
    </SiteSection>
  );
}

function FlowNode({ icon, label }: { icon: IconName; label: string }) {
  return (
    <Stack flex={1} alignItems="center" gap="$sm">
      <IconTile icon={icon} />
      <Text variant="caption" bold color="$colorSubtle" textAlign="center">
        {label}
      </Text>
    </Stack>
  );
}

/** Customer → employee's phone → owner, locked to the owner's key. */
function BitcoinFlow() {
  const flow = useSite().copy.team.flow;
  return (
    <Card role="img" aria-label={flow.label} gap="$lg" padding="$xl">
      <Row alignItems="flex-start" gap="$xs">
        <FlowNode icon="User" label={flow.customer} />
        <Stack paddingTop="$md">
          <Icon name="ChevronRight" color="$colorMuted" />
        </Stack>
        <FlowNode icon="Smartphone" label={flow.employee} />
        <Stack paddingTop="$md">
          <Icon name="ChevronRight" color="$colorMuted" />
        </Stack>
        <FlowNode icon="Store" label={flow.owner} />
      </Row>
      <Row justifyContent="center">
        <Pill label={flow.lock} tone="accent" icon="KeyRound" />
      </Row>
    </Card>
  );
}

export function TeamFeature() {
  const { copy } = useSite();
  const team = copy.team;
  return (
    <SiteSection id={sectionIds.team}>
      <Reveal>
        <Showcase
          text={
            <>
              <SectionHeading
                eyebrow={team.eyebrow}
                title={team.title}
                body={team.body}
              />
              <PointList points={team.points} />
              <BitcoinFlow />
            </>
          }
          phone={
            <DemoApp
              initialTab="team"
              accessibilityLabel={copy.demo.teamDemo}
              maxWidth={phoneWidth}
            />
          }
        />
      </Reveal>
    </SiteSection>
  );
}

export function WalletFeature() {
  const { copy } = useSite();
  const wallet = copy.wallet;
  return (
    <SiteSection id={sectionIds.wallet}>
      <Reveal>
        <Showcase
          phoneFirst
          text={
            <>
              <SectionHeading
                eyebrow={wallet.eyebrow}
                title={wallet.title}
                body={wallet.body}
              />
              <PointList points={wallet.points} />
            </>
          }
          phone={
            <DemoApp
              initialTab="wallet"
              accessibilityLabel={copy.demo.walletDemo}
              maxWidth={phoneWidth}
            />
          }
        />
      </Reveal>
    </SiteSection>
  );
}

export function PrivacyFeature() {
  const { copy } = useSite();
  const privacy = copy.privacy;
  return (
    <SiteSection id={sectionIds.privacy}>
      <Reveal>
        <Showcase
          text={
            <>
              <SectionHeading
                eyebrow={privacy.eyebrow}
                title={privacy.title}
                body={privacy.body}
              />
              <PointList points={privacy.points} />
            </>
          }
          phone={
            <DemoApp
              initialTab="settings"
              accessibilityLabel={copy.demo.settingsDemo}
              maxWidth={phoneWidth}
            />
          }
        />
      </Reveal>
    </SiteSection>
  );
}
