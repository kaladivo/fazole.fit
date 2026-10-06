import {
  BrandMark,
  Button,
  Card,
  Row,
  Stack,
  Text,
  useMedia,
} from "@platitprosim/ui";
import { border } from "@platitprosim/ui/tokens";
import { siteConfig } from "../config";
import { useSite } from "../site/site";
import { Glow, Reveal } from "./parts";

export function Closing() {
  const { copy } = useSite();
  const { wide } = useMedia();
  return (
    <Stack render="section" paddingVertical="$huge">
      <Reveal>
        <Card
          position="relative"
          overflow="hidden"
          alignItems="center"
          gap="$xxl"
          paddingVertical="$huge"
          paddingHorizontal="$xxl"
          borderRadius="$sheet"
        >
          <Glow />
          <BrandMark size="hero" />
          <Stack gap="$md" alignItems="center" maxWidth="$contentWidth">
            <Text
              variant={wide ? "amount" : "display"}
              color="$colorStrong"
              textAlign="center"
              role="heading"
              aria-level={2}
            >
              {copy.closing.title}
            </Text>
            <Text
              variant="title"
              fontWeight="$regular"
              color="$colorMuted"
              textAlign="center"
            >
              {copy.closing.body}
            </Text>
          </Stack>
          <Button
            render={<a href={siteConfig.webAppUrl} />}
            role="link"
            size="lg"
            icon="Smartphone"
          >
            {copy.hero.primaryCta}
          </Button>
        </Card>
      </Reveal>
    </Stack>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Text
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
      variant="label"
      color="$colorMuted"
      hoverStyle={{ color: "$colorStrong" }}
    >
      {label}
    </Text>
  );
}

export function SiteFooter() {
  const { copy } = useSite();
  return (
    <Row
      render="footer"
      justifyContent="space-between"
      flexWrap="wrap"
      gap="$lg"
      paddingVertical="$xxl"
      borderTopWidth={border.hairline}
      borderColor="$borderColor"
    >
      <Row gap="$sm" flexShrink={1}>
        <BrandMark size="iconLg" />
        <Text variant="label" muted flexShrink={1}>
          {copy.footer.tagline}
        </Text>
      </Row>
      <Row gap="$xl">
        <FooterLink href={siteConfig.linkyUrl} label={copy.footer.linky} />
        <FooterLink href={siteConfig.githubUrl} label={copy.footer.github} />
      </Row>
    </Row>
  );
}
