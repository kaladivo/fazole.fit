import * as UI from "@platitprosim/ui";

/** A labelled placeholder block for layout examples. */
export function Box({ label }: { label: string }) {
  return (
    <UI.Stack
      padding="$md"
      borderRadius="$sm"
      backgroundColor="$accentSoft"
      alignItems="center"
    >
      <UI.Text variant="caption" color="$accentText">
        {label}
      </UI.Text>
    </UI.Stack>
  );
}
