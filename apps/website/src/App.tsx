import { Stack } from "@platitprosim/ui";
import { DemoProvider } from "./demo/DemoProvider";
import { Comparison } from "./sections/Comparison";
import { Closing, SiteFooter } from "./sections/Closing";
import { Faq } from "./sections/Faq";
import {
  HistoryFeature,
  PrivacyFeature,
  TeamFeature,
  WalletFeature,
} from "./sections/Features";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { SiteHeader } from "./sections/SiteHeader";
import { SiteProvider } from "./site/SiteProvider";

export function App() {
  return (
    <SiteProvider>
      <DemoProvider>
        <Stack id="top" flexGrow={1} gap="$none" backgroundColor="$background">
          <SiteHeader />
          <Stack
            render="main"
            width="100%"
            maxWidth="$appWidth"
            alignSelf="center"
            paddingHorizontal="$xl"
            gap="$none"
          >
            <Hero />
            <HowItWorks />
            <HistoryFeature />
            <TeamFeature />
            <WalletFeature />
            <Comparison />
            <PrivacyFeature />
            <Faq />
            <Closing />
          </Stack>
          <Stack
            width="100%"
            maxWidth="$appWidth"
            alignSelf="center"
            paddingHorizontal="$xl"
            gap="$none"
          >
            <SiteFooter />
          </Stack>
        </Stack>
      </DemoProvider>
    </SiteProvider>
  );
}
