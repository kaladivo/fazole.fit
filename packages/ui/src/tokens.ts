const palette = {
  white: "#ffffff",
  black: "#000000",
  // Bean cream: the light theme's paper.
  cream50: "#fffdf8",
  cream100: "#f8f4ea",
  cream200: "#eee6d5",
  // Warm browns, from bean skin to black bean: text and the dark theme.
  bean50: "#f7f4ee",
  bean100: "#ece6dc",
  bean200: "#dad1c3",
  bean300: "#bfb3a2",
  bean400: "#a09382",
  bean500: "#75695a",
  bean600: "#5e5446",
  bean700: "#473e33",
  bean750: "#382f27",
  bean800: "#2a231d",
  bean900: "#1b1612",
  bean950: "#100c09",
  // Green bean pod: the brand accent.
  pod100: "#e2f0cc",
  pod200: "#c6e29f",
  pod300: "#a3cf68",
  pod400: "#86bb41",
  pod500: "#659e26",
  pod600: "#4a7d1b",
  pod700: "#3d6619",
  pod800: "#335219",
  pod950: "#152609",
  // Red kidney bean: only the logo's hilum.
  kidney: "#a3312c",
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
  amber200: "#fde68a",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  amber600: "#d97706",
  amber800: "#92400e",
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

/** The logo mark's geometry; apps/web-app/public/logo.svg draws the same. */
export const brandMark = {
  viewBox: "0 0 64 64",
  color: palette.pod600,
  bean: {
    path: "M19 37.6Q30.4 26.2 46 30.3",
    color: palette.cream100,
    width: 22,
  },
  hilum: { path: "M30.5 38L36.3 36.4", color: palette.kidney, width: 3 },
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
  background: palette.bean950,
  backgroundPress: palette.bean800,
  surface: palette.bean900,
  surfaceRaised: palette.bean750,
  surfacePress: palette.bean800,
  // Tamagui's built-in focus styles read this key.
  backgroundFocus: palette.bean900,
  neutral: palette.bean500,
  neutralSoft: alpha(palette.bean300, 0.12),
  color: palette.bean100,
  colorStrong: palette.bean50,
  colorSubtle: palette.bean200,
  colorMuted: palette.bean400,
  placeholderColor: palette.bean500,
  borderColor: alpha(palette.bean300, 0.14),
  borderColorHover: alpha(palette.bean300, 0.3),
  outlineColor: alpha(palette.pod400, 0.6),
  shadowColor: alpha(palette.black, 0.5),
  scrim: alpha(palette.bean950, 0.74),
  accent: palette.pod400,
  accentHover: palette.pod300,
  accentPress: palette.pod500,
  onAccent: palette.pod950,
  accentSoft: alpha(palette.pod400, 0.16),
  accentText: palette.pod200,
  success: palette.emerald400,
  onSuccess: palette.bean950,
  successSoft: alpha(palette.emerald400, 0.14),
  successText: palette.emerald200,
  danger: palette.red400,
  onDanger: palette.red950,
  dangerSoft: alpha(palette.red500, 0.14),
  dangerText: palette.red200,
  warning: palette.amber400,
  warningSoft: alpha(palette.amber500, 0.14),
  warningText: palette.amber200,
  info: palette.sky400,
  infoSoft: alpha(palette.sky400, 0.14),
  infoText: palette.sky300,
  qrBackground: palette.white,
  qrForeground: palette.black,
  scannerBackground: palette.black,
};

export type ThemeColors = typeof dark;

const light: ThemeColors = {
  background: palette.cream100,
  backgroundPress: palette.cream200,
  surface: palette.cream50,
  surfaceRaised: palette.white,
  surfacePress: palette.cream200,
  backgroundFocus: palette.cream50,
  neutral: palette.bean400,
  neutralSoft: alpha(palette.bean500, 0.1),
  color: palette.bean900,
  colorStrong: palette.bean950,
  colorSubtle: palette.bean700,
  colorMuted: palette.bean500,
  placeholderColor: palette.bean400,
  borderColor: alpha(palette.bean900, 0.09),
  borderColorHover: alpha(palette.bean900, 0.2),
  outlineColor: alpha(palette.pod500, 0.5),
  shadowColor: alpha(palette.bean900, 0.12),
  scrim: alpha(palette.bean900, 0.42),
  accent: palette.pod600,
  accentHover: palette.pod700,
  accentPress: palette.pod800,
  onAccent: palette.white,
  accentSoft: alpha(palette.pod500, 0.13),
  accentText: palette.pod800,
  success: palette.emerald600,
  onSuccess: palette.white,
  successSoft: alpha(palette.emerald500, 0.12),
  successText: palette.emerald800,
  danger: palette.red600,
  onDanger: palette.white,
  dangerSoft: alpha(palette.red500, 0.1),
  dangerText: palette.red800,
  warning: palette.amber600,
  warningSoft: alpha(palette.amber500, 0.14),
  warningText: palette.amber800,
  info: palette.sky600,
  infoSoft: alpha(palette.sky500, 0.1),
  infoText: palette.sky800,
  qrBackground: palette.white,
  qrForeground: palette.black,
  scannerBackground: palette.bean900,
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
