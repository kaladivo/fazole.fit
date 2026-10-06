import {
  BrandMark,
  Button,
  IconButton,
  Row,
  Stack,
  Text,
  useMedia,
} from "@platitprosim/ui";
import { border } from "@platitprosim/ui/tokens";
import { siteConfig } from "../config";
import { useSite } from "../site/site";
import { sectionIds } from "./sectionIds";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Text
      render={<a href={href} />}
      variant="label"
      color="$colorMuted"
      hoverStyle={{ color: "$colorStrong" }}
    >
      {label}
    </Text>
  );
}

/** The sticky, translucent bar: brand, sections on wide screens, language, appearance and the app. */
export function SiteHeader() {
  const { copy, mode, toggleLocale, toggleMode } = useSite();
  const { wide } = useMedia();
  const nav = copy.nav;
  return (
    <Stack
      render="header"
      position="sticky"
      top="$none"
      zIndex="$sticky"
      gap="$none"
      backdropFilter="blur(16px)"
      borderBottomWidth={border.hairline}
      borderColor="$borderColor"
    >
      <Stack
        position="absolute"
        top="$none"
        bottom="$none"
        left="$none"
        right="$none"
        backgroundColor="$background"
        opacity={0.82}
      />
      <Row
        position="relative"
        width="100%"
        maxWidth="$appWidth"
        alignSelf="center"
        justifyContent="space-between"
        paddingHorizontal="$xl"
        paddingVertical="$md"
      >
        <Row render={<a href="#top" aria-label={nav.home} />} gap="$sm">
          <BrandMark size="controlSm" />
          <Text variant="title" color="$colorStrong">
            Platit prosím
          </Text>
        </Row>
        {wide ? (
          <Row render="nav" gap="$xxl">
            <NavLink
              href={`#${sectionIds.howItWorks}`}
              label={nav.howItWorks}
            />
            <NavLink href={`#${sectionIds.team}`} label={nav.team} />
            <NavLink
              href={`#${sectionIds.comparison}`}
              label={nav.comparison}
            />
            <NavLink href={`#${sectionIds.faq}`} label={nav.faq} />
          </Row>
        ) : null}
        <Row gap="$xs">
          <Button
            size="sm"
            variant="ghost"
            icon="Languages"
            aria-label={nav.switchLanguage}
            tooltip={nav.switchLanguage}
            onPress={toggleLocale}
          >
            {nav.languageShort}
          </Button>
          <IconButton
            icon={mode === "dark" ? "Sun" : "Moon"}
            size="sm"
            accessibilityLabel={mode === "dark" ? nav.toLight : nav.toDark}
            onPress={toggleMode}
          />
          {wide ? (
            <Button
              render={<a href={siteConfig.webAppUrl} />}
              role="link"
              size="sm"
              marginLeft="$sm"
            >
              {nav.openApp}
            </Button>
          ) : null}
        </Row>
      </Row>
    </Stack>
  );
}
