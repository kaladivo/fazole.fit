import Svg, { Path, Rect } from "react-native-svg";
import { brandMark, size as sizes } from "./tokens";

export interface BrandMarkProps {
  size?: keyof typeof sizes | undefined;
  accessibilityLabel?: string | undefined;
}

/** The app's logo mark: a "P" with a full stop, like a QR module, on an indigo tile. */
export function BrandMark({
  size = "controlLg",
  accessibilityLabel = "Platit prosím",
}: BrandMarkProps) {
  const width = sizes[size];
  const { dot } = brandMark;
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
        d={brandMark.letter}
        fill="none"
        stroke="#ffffff"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x={dot.x}
        y={dot.y}
        width={dot.size}
        height={dot.size}
        rx={dot.radius}
        fill="#ffffff"
      />
    </Svg>
  );
}
