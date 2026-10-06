import { useId, useState } from "react";
import type { ComponentRef, ReactNode, Ref } from "react";
import { Input, Label } from "tamagui";
import type { InputProps } from "tamagui";
import { Row, Stack, Text } from "./layout";
import { fieldStyle, textVariant } from "./styles";
import { opacity, size, space } from "./tokens";

export interface TextFieldProps extends Omit<InputProps, "size"> {
  label: string;
  hideLabel?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  /** Sits inside the field at its end, e.g. an `sm` IconButton to paste; a string is a muted suffix such as "Kč". */
  trailing?: ReactNode;
  ref?: Ref<ComponentRef<typeof Input>> | undefined;
}

export function TextField({
  label,
  hideLabel,
  hint,
  error,
  trailing,
  id,
  disabled,
  multiline = false,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [trailingWidth, setTrailingWidth] = useState<number>(size.controlSm);
  const description = error || hint;
  return (
    <Stack gap="$xs" opacity={disabled ? opacity.disabled : 1}>
      {hideLabel ? null : (
        <Label
          unstyled
          htmlFor={fieldId}
          fontFamily="$body"
          {...textVariant("label")}
          color="$colorSubtle"
        >
          {label}
        </Label>
      )}
      {/* Always wrapped, so a trailing element that comes and goes never remounts the focused input. */}
      <Stack position="relative">
        <Input
          unstyled
          {...fieldStyle}
          id={fieldId}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={description ? `${fieldId}-description` : undefined}
          {...(error ? { borderColor: "$danger" } : {})}
          disabled={disabled}
          multiline={multiline}
          {...(multiline ? { rows: 4, whiteSpace: "pre-wrap" } : {})}
          paddingRight={trailing ? trailingWidth + 2 * space.md : "$lg"}
          // Tamagui drops `spellCheck` on the web and renders `multiline` as a single-line input; the render element fixes both.
          render={
            multiline ? (
              <textarea spellCheck={props.spellCheck} />
            ) : (
              <input spellCheck={props.spellCheck} />
            )
          }
          {...props}
        />
        {trailing ? (
          <Row
            position="absolute"
            right={space.md}
            {...(multiline ? { bottom: space.md } : { top: 0, bottom: 0 })}
            maxWidth="50%"
            onLayout={(event) =>
              setTrailingWidth(event.nativeEvent.layout.width)
            }
          >
            {typeof trailing === "string" ? (
              <Text variant="label" color="$colorMuted" numberOfLines={1}>
                {trailing}
              </Text>
            ) : (
              trailing
            )}
          </Row>
        ) : null}
      </Stack>
      {description ? (
        <Text
          id={`${fieldId}-description`}
          variant="caption"
          color={error ? "$dangerText" : "$colorMuted"}
          role={error ? "alert" : undefined}
        >
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}
