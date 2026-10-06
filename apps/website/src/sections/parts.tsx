import {
  Card,
  Icon,
  Row,
  Stack,
  Text,
  themes,
  useMedia,
} from "@platitprosim/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Point } from "../copy";
import { useSite } from "../site/site";

const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Rises into place the first time it scrolls into view. */
export function Reveal({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(prefersReducedMotion);
  return (
    <Stack
      gap="$none"
      ref={(node) => {
        if (visible || !(node instanceof Element)) return;
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry?.isIntersecting) return;
            setVisible(true);
            observer.disconnect();
          },
          { threshold: 0.12 },
        );
        observer.observe(node);
        return () => observer.disconnect();
      }}
      opacity={visible ? 1 : 0}
      y={visible ? 0 : 32}
      transition="slow"
    >
      {children}
    </Stack>
  );
}

/** A soft pool of accent light behind a phone. */
export function Glow() {
  const { mode } = useSite();
  return (
    <Stack
      aria-hidden
      position="absolute"
      top="$none"
      bottom="$none"
      left="$none"
      right="$none"
      pointerEvents="none"
      backgroundImage={`radial-gradient(closest-side, ${themes[mode].accent}, transparent)`}
      opacity={mode === "dark" ? 0.3 : 0.18}
      filter="blur(32px)"
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  centered?: boolean;
}) {
  const align = centered ? "center" : "left";
  return (
    <Stack
      gap="$md"
      maxWidth="$contentWidth"
      alignSelf={centered ? "center" : "flex-start"}
      alignItems={centered ? "center" : "flex-start"}
    >
      <Text variant="label" bold color="$accentText" textAlign={align}>
        {eyebrow}
      </Text>
      <Text
        variant="display"
        color="$colorStrong"
        role="heading"
        aria-level={2}
        textAlign={align}
      >
        {title}
      </Text>
      {body ? (
        <Text
          variant="title"
          fontWeight="$regular"
          color="$colorMuted"
          textAlign={align}
        >
          {body}
        </Text>
      ) : null}
    </Stack>
  );
}

/** An icon in a soft accent tile. */
export function IconTile({ icon }: { icon: Point["icon"] }) {
  return (
    <Stack
      width="$avatar"
      height="$avatar"
      flexShrink={0}
      alignItems="center"
      justifyContent="center"
      borderRadius="$control"
      backgroundColor="$accentSoft"
    >
      <Icon name={icon} color="$accentText" />
    </Stack>
  );
}

export function PointList({ points }: { points: readonly Point[] }) {
  return (
    <Stack gap="$xl">
      {points.map((point) => (
        <Row key={point.title} alignItems="flex-start" gap="$lg">
          <IconTile icon={point.icon} />
          <Stack flex={1} gap="$xxs">
            <Text variant="title" color="$colorStrong">
              {point.title}
            </Text>
            <Text muted>{point.body}</Text>
          </Stack>
        </Row>
      ))}
    </Stack>
  );
}

/** Point cards in rows of `columns` on wide screens, stacked on phones. */
export function PointGrid({
  points,
  columns,
}: {
  points: readonly Point[];
  columns: number;
}) {
  const { wide } = useMedia();
  const card = (point: Point) => (
    <Card
      key={point.title}
      flex={wide ? 1 : undefined}
      gap="$lg"
      padding="$xxl"
    >
      <IconTile icon={point.icon} />
      <Stack gap="$xs">
        <Text variant="title" color="$colorStrong">
          {point.title}
        </Text>
        <Text muted>{point.body}</Text>
      </Stack>
    </Card>
  );
  if (!wide) return <Stack gap="$lg">{points.map(card)}</Stack>;
  const rows = Array.from(
    { length: Math.ceil(points.length / columns) },
    (_, index) => points.slice(index * columns, (index + 1) * columns),
  );
  return (
    <Stack gap="$lg">
      {rows.map((row, index) => (
        <Row key={index} gap="$lg" alignItems="stretch">
          {row.map(card)}
        </Row>
      ))}
    </Stack>
  );
}

/** A page section: its anchor and the vertical rhythm between sections. */
export function SiteSection({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { wide } = useMedia();
  return (
    <Stack
      render="section"
      id={id}
      gap="$huge"
      paddingVertical={wide ? "$huge" : "$xxxl"}
    >
      {children}
    </Stack>
  );
}

/** Text beside a phone on wide screens, stacked above it on phones. */
export function Showcase({
  text,
  phone,
  phoneFirst = false,
}: {
  text: ReactNode;
  phone: ReactNode;
  phoneFirst?: boolean;
}) {
  const { wide } = useMedia();
  const phoneColumn = (
    <Stack
      flex={wide ? 1 : undefined}
      position="relative"
      alignItems="center"
      paddingVertical="$xl"
    >
      <Glow />
      {phone}
    </Stack>
  );
  const textColumn = (
    <Stack flex={wide ? 1 : undefined} gap="$xxxl" justifyContent="center">
      {text}
    </Stack>
  );
  return wide ? (
    <Row gap="$huge" alignItems="center">
      {phoneFirst ? phoneColumn : textColumn}
      {phoneFirst ? textColumn : phoneColumn}
    </Row>
  ) : (
    <Stack gap="$xxl">
      {textColumn}
      {phoneColumn}
    </Stack>
  );
}
