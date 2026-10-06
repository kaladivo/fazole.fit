import Svg, { Path, Rect } from "react-native-svg";
import { Text } from "./layout";
import { brandMark, letterSpacing, size as sizes } from "./tokens";

export interface BrandMarkProps {
  size?: keyof typeof sizes | undefined;
  accessibilityLabel?: string | undefined;
}

/** The app's logo mark: a cream bean with a red hilum on a green-pod tile. */
export function BrandMark({
  size = "controlLg",
  accessibilityLabel = "fazole.fit",
}: BrandMarkProps) {
  const width = sizes[size];
  const { bean, hilum } = brandMark;
  return (
    <Svg
      width={width}
      height={width}
      viewBox={brandMark.viewBox}
      role="img"
      aria-label={accessibilityLabel}
    >
      <Rect width={64} height={64} rx={18} fill={brandMark.color} />
      <Path
        d={bean.path}
        fill="none"
        stroke={bean.color}
        strokeWidth={bean.width}
        strokeLinecap="round"
      />
      <Path
        d={hilum.path}
        stroke={hilum.color}
        strokeWidth={hilum.width}
        strokeLinecap="round"
      />
    </Svg>
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
