import { Image } from "tamagui";
import { Text } from "./layout";
import logo from "./logo.webp";
import { brandMark, letterSpacing, size as sizes } from "./tokens";

export interface BrandMarkProps {
  size?: keyof typeof sizes | undefined;
  accessibilityLabel?: string | undefined;
}

/** The app's logo mark: a gold bean on a black tile. */
export function BrandMark({
  size = "controlLg",
  accessibilityLabel = "fazole.fit",
}: BrandMarkProps) {
  const width = sizes[size];
  return (
    <Image
      src={logo}
      alt={accessibilityLabel}
      width={width}
      height={width}
      borderRadius={width * brandMark.cornerRatio}
    />
  );
}

export interface WordmarkProps {
  size?: "title" | "heading" | "display" | "amount" | undefined;
}

/** The brand name, set like the logo: "fazole" with an accent ".fit". */
export function Wordmark({ size = "title" }: WordmarkProps) {
  return (
    <Text
      variant={size}
      fontFamily="$display"
      fontWeight="$extrabold"
      letterSpacing={letterSpacing.display}
      color="$colorStrong"
    >
      fazole
      <Text
        variant={size}
        fontFamily="$display"
        fontWeight="$extrabold"
        color="$accent"
      >
        .fit
      </Text>
    </Text>
  );
}
