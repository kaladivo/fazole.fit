const palette = {
  white: "#ffffff",
  black: "#000000",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate750: "#283548",
  slate800: "#1e293b",
  slate900: "#0f172a",
  slate950: "#020617",
  indigo100: "#e0e7ff",
  indigo200: "#c7d2fe",
  indigo300: "#a5b4fc",
  indigo400: "#818cf8",
  indigo500: "#6366f1",
  indigo600: "#4f46e5",
  indigo700: "#4338ca",
  indigo800: "#3730a3",
  indigo950: "#1e1b4b",
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
  control: 16,
  key: 20,
  card: 24,
  sheet: 32,
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
  color: "#4f46e5",
  letter: "M22 47V17h11a10.5 10.5 0 0 1 0 21H22",
  dot: { x: 39, y: 41, size: 9, radius: 3 },
} as const;

export const fontFamily = {
  body: '"Plus Jakarta Sans", system-ui, sans-serif',
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
  background: palette.slate950,
  backgroundPress: palette.slate800,
  surface: palette.slate900,
  surfaceRaised: palette.slate750,
  surfacePress: palette.slate800,
  // Tamagui's built-in focus styles read this key.
  backgroundFocus: palette.slate900,
  neutral: palette.slate500,
  neutralSoft: alpha(palette.slate400, 0.14),
  color: palette.slate200,
  colorStrong: palette.slate50,
  colorSubtle: palette.slate300,
  colorMuted: palette.slate400,
  placeholderColor: palette.slate500,
  borderColor: alpha(palette.slate400, 0.16),
  borderColorHover: alpha(palette.slate400, 0.32),
  outlineColor: alpha(palette.indigo400, 0.55),
  shadowColor: alpha(palette.black, 0.45),
  scrim: alpha(palette.slate950, 0.72),
  accent: palette.indigo400,
  accentHover: palette.indigo300,
  accentPress: palette.indigo500,
  onAccent: palette.indigo950,
  accentSoft: alpha(palette.indigo400, 0.16),
  accentText: palette.indigo200,
  success: palette.emerald400,
  onSuccess: palette.slate950,
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
  background: palette.slate100,
  backgroundPress: palette.slate200,
  surface: palette.white,
  surfaceRaised: palette.slate50,
  surfacePress: palette.slate200,
  backgroundFocus: palette.white,
  neutral: palette.slate400,
  neutralSoft: alpha(palette.slate500, 0.1),
  color: palette.slate900,
  colorStrong: palette.slate950,
  colorSubtle: palette.slate700,
  colorMuted: palette.slate500,
  placeholderColor: palette.slate400,
  borderColor: alpha(palette.slate900, 0.08),
  borderColorHover: alpha(palette.slate900, 0.2),
  outlineColor: alpha(palette.indigo500, 0.45),
  shadowColor: alpha(palette.slate900, 0.1),
  scrim: alpha(palette.slate900, 0.4),
  accent: palette.indigo600,
  accentHover: palette.indigo700,
  accentPress: palette.indigo800,
  onAccent: palette.white,
  accentSoft: alpha(palette.indigo500, 0.1),
  accentText: palette.indigo700,
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
  scannerBackground: palette.slate900,
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
