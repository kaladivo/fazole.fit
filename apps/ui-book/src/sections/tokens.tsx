import * as UI from "@platitprosim/ui";
import type { Section } from "../section";

const colorKeys = [
  "background",
  "surface",
  "surfaceRaised",
  "neutralSoft",
  "accent",
  "accentSoft",
  "success",
  "successSoft",
  "warning",
  "warningSoft",
  "danger",
  "dangerSoft",
  "info",
  "infoSoft",
] as const satisfies readonly (keyof UI.ThemeColors)[];

const textVariants = Object.keys(UI.typography.size).filter(
  (variant): variant is UI.TextVariant => variant in UI.typography.size,
);

export const tokens: Section = {
  title: "Tokens",
  entries: {
    Colors: () => (
      <UI.Row flexWrap="wrap" gap="$md">
        {colorKeys.map((key) => (
          <UI.Stack key={key} gap="$xs" width={96}>
            <UI.Stack
              height="$control"
              borderRadius="$control"
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor={`$${key}`}
            />
            <UI.Text variant="caption" muted>
              {key}
            </UI.Text>
          </UI.Stack>
        ))}
      </UI.Row>
    ),
    Typography: () => (
      <UI.Stack gap="$sm">
        {textVariants.map((variant) => (
          <UI.Row key={variant} alignItems="baseline">
            <UI.Text variant="caption" muted width={72}>
              {variant}
            </UI.Text>
            <UI.Text variant={variant} numberOfLines={1} flex={1}>
              Platit prosím 1 250 Kč
            </UI.Text>
          </UI.Row>
        ))}
      </UI.Stack>
    ),
  },
};
