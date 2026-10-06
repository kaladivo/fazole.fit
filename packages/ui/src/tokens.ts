const palette = {
  white: "#ffffff",
  black: "#000000",
  // Ivory paper: the light theme's background.
  ivory50: "#fffdf8",
  ivory100: "#f7f4ec",
  ivory200: "#ebe5d6",
  // Warm ink, from smoke to night black: text and the dark theme.
  ink50: "#f6f4ef",
  ink100: "#ebe7df",
  ink200: "#d6d0c4",
  ink300: "#b8b0a1",
  ink400: "#978e7e",
  ink500: "#6f685b",
  ink600: "#575146",
  ink700: "#403b33",
  ink750: "#2b2721",
  ink800: "#1f1c18",
  ink900: "#151310",
  ink950: "#0a0908",
  // Gold: the brand accent.
  gold100: "#f8ecc4",
  gold200: "#efd88e",
  gold300: "#e5c45f",
  gold400: "#d8ae3a",
  gold500: "#c4922a",
  gold600: "#a6780f",
  gold700: "#875f10",
  gold800: "#674811",
  emerald200: "#a7f3d0",
  emerald400: "#34d399",
  emerald500: "#10b981",
  emerald600: "#059669",
  emerald800: "#065f46",
  red200: "#fecaca",
  red400: "#f87171",
  red500: "#ef4444",
  red600: "#dc2626",
  red800: "#991b1b",
  red950: "#450a0a",
  orange200: "#fed7aa",
  orange400: "#fb923c",
  orange500: "#f97316",
  orange600: "#ea580c",
  orange800: "#9a3412",
  sky300: "#7dd3fc",
  sky400: "#38bdf8",
  sky500: "#0ea5e9",
  sky600: "#0284c7",
  sky800: "#075985",
};

/** Appends an alpha channel to a 6-digit hex color. */
const alpha = (hex: string, opacity: number) =>
  `${hex}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;

export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const radius = {
  none: 0,
  sm: 10,
  control: 18,
  // Half the full key height, so keypad keys are bean-shaped pills.
  key: 34,
  card: 28,
  sheet: 36,
  pill: 999,
};

export const size = {
  none: 0,
  track: 6,
  dot: 8,
  iconSm: 16,
  icon: 20,
  iconLg: 24,
  iconXl: 40,
  controlSm: 36,
  control: 48,
  avatar: 44,
  controlLg: 56,
  amount: 64,
  keyMin: 44,
  key: 68,
  row: 64,
  rail: 96,
  hero: 104,
  picker: 200,
  qr: 240,
  qrLg: 400,
  scanner: 280,
  narrowWidth: 480,
  sheetWidth: 520,
  contentWidth: 720,
  appWidth: 1240,
};

export const border = { hairline: 1, emphasis: 2, focus: 3, scanner: 4 };

export const iconStroke = 2;

export const letterSpacing = { eyebrow: 0.8, amount: -1.5, display: -0.5 };

export const opacity = { disabled: 0.45, dimmed: 0.8 };

export const zIndex = {
  base: 0,
  raised: 1,
  sticky: 10,
  overlay: 80,
  toast: 100,
};

export const duration = { fast: 140, base: 220, slow: 460 };

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export const enterScale = { subtle: 0.96, pop: 0.6 };

export const breakpoint = { wide: 900 };

export const shadow = {
  raised: "0px 2px 8px $shadowColor",
  floating: "0px 20px 48px $shadowColor",
};

/** The logo tile: a gold bean photographed on black (src/logo.webp, apps/web-app/public/logo.webp). */
export const brandMark = {
  background: palette.black,
  // Corner radius as a share of the tile's width.
  cornerRatio: 0.28,
} as const;

export const fontFamily = {
  body: '"Plus Jakarta Sans", system-ui, sans-serif',
  display: '"Bricolage Grotesque", "Plus Jakarta Sans", system-ui, sans-serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

export const fontWeight = {
  regular: "400",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

export const typography = {
  size: {
    caption: 12,
    label: 14,
    body: 16,
    title: 18,
    heading: 24,
    display: 34,
    amount: 56,
  },
  lineHeight: {
    caption: 16,
    label: 20,
    body: 24,
    title: 24,
    heading: 30,
    display: 40,
    amount: 64,
  },
  weight: {
    caption: "regular",
    label: "semibold",
    body: "regular",
    title: "bold",
    heading: "bold",
    display: "extrabold",
    amount: "extrabold",
  },
} as const satisfies {
  size: object;
  lineHeight: object;
  weight: Record<string, keyof typeof fontWeight>;
};

export type TextVariant = keyof typeof typography.size;

const dark = {
  background: palette.ink950,
  backgroundPress: palette.ink800,
  surface: palette.ink900,
  surfaceRaised: palette.ink750,
  surfacePress: palette.ink800,
  // Tamagui's built-in focus styles read this key.
  backgroundFocus: palette.ink900,
  neutral: palette.ink500,
  neutralSoft: alpha(palette.ink300, 0.12),
  color: palette.ink100,
  colorStrong: palette.ink50,
  colorSubtle: palette.ink200,
  colorMuted: palette.ink400,
  placeholderColor: palette.ink500,
  borderColor: alpha(palette.ink300, 0.14),
  borderColorHover: alpha(palette.ink300, 0.3),
  outlineColor: alpha(palette.gold400, 0.6),
  shadowColor: alpha(palette.black, 0.5),
  scrim: alpha(palette.ink950, 0.74),
  accent: palette.gold400,
  accentHover: palette.gold300,
  accentPress: palette.gold500,
  onAccent: palette.ink950,
  accentSoft: alpha(palette.gold400, 0.16),
  accentText: palette.gold200,
  success: palette.emerald400,
  onSuccess: palette.ink950,
  successSoft: alpha(palette.emerald400, 0.14),
  successText: palette.emerald200,
  danger: palette.red400,
  onDanger: palette.red950,
  dangerSoft: alpha(palette.red500, 0.14),
  dangerText: palette.red200,
  warning: palette.orange400,
  warningSoft: alpha(palette.orange500, 0.14),
  warningText: palette.orange200,
  info: palette.sky400,
  infoSoft: alpha(palette.sky400, 0.14),
  infoText: palette.sky300,
  qrBackground: palette.white,
  qrForeground: palette.black,
  scannerBackground: palette.black,
};

export type ThemeColors = typeof dark;

const light: ThemeColors = {
  background: palette.ivory100,
  backgroundPress: palette.ivory200,
  surface: palette.ivory50,
  surfaceRaised: palette.white,
  surfacePress: palette.ivory200,
  backgroundFocus: palette.ivory50,
  neutral: palette.ink400,
  neutralSoft: alpha(palette.ink500, 0.1),
  color: palette.ink900,
  colorStrong: palette.ink950,
  colorSubtle: palette.ink700,
  colorMuted: palette.ink500,
  placeholderColor: palette.ink400,
  borderColor: alpha(palette.ink900, 0.09),
  borderColorHover: alpha(palette.ink900, 0.2),
  outlineColor: alpha(palette.gold600, 0.5),
  shadowColor: alpha(palette.ink900, 0.12),
  scrim: alpha(palette.ink900, 0.42),
  accent: palette.gold600,
  accentHover: palette.gold500,
  accentPress: palette.gold700,
  onAccent: palette.ink950,
  accentSoft: alpha(palette.gold500, 0.16),
  accentText: palette.gold800,
  success: palette.emerald600,
  onSuccess: palette.white,
  successSoft: alpha(palette.emerald500, 0.12),
  successText: palette.emerald800,
  danger: palette.red600,
  onDanger: palette.white,
  dangerSoft: alpha(palette.red500, 0.1),
  dangerText: palette.red800,
  warning: palette.orange600,
  warningSoft: alpha(palette.orange500, 0.14),
  warningText: palette.orange800,
  info: palette.sky600,
  infoSoft: alpha(palette.sky500, 0.1),
  infoText: palette.sky800,
  qrBackground: palette.white,
  qrForeground: palette.black,
  scannerBackground: palette.ink900,
};

export const themes = { dark, light };

export type ColorMode = keyof typeof themes;

export type Tone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";
