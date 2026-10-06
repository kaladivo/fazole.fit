import { useState } from "react";
import QRCodeSvg from "react-native-qrcode-svg";
import {
  Dialog as TamaguiDialog,
  getVariableValue,
  Portal,
  Theme,
  useTheme,
  View,
  VisuallyHidden,
} from "tamagui";
import { BrandMark } from "./brand-mark";
import { Button, IconButton, Pressable } from "./controls";
import type { LabeledAction } from "./controls";
import { AmountDisplay } from "./display";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import { Row, Stack, Text } from "./layout";
import { Modal } from "./overlays";
import { tooltipProps } from "./styles";
import {
  border,
  enterScale,
  opacity,
  shadow,
  size as sizes,
  space,
} from "./tokens";

export type KeypadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "decimal"
  | "backspace";

export interface KeypadProps {
  accessibilityLabel: string;
  onKeyPress: (key: KeypadKey) => void;
  /** Accessible names of the non-digit keys. */
  labels: { decimal: string; backspace: string };
  /** The visible decimal separator; Czech amounts use a comma. */
  decimalSymbol?: string | undefined;
  disabled?: boolean | undefined;
}

const keyRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["decimal", "0", "backspace"],
] as const satisfies readonly (readonly KeypadKey[])[];

/** A thumb-sized numeric keypad for entering an amount; its keys shrink when the screen is short. */
export function Keypad({
  accessibilityLabel,
  onKeyPress,
  labels,
  decimalSymbol = ",",
  disabled,
}: KeypadProps) {
  return (
    <Stack
      role="group"
      aria-label={accessibilityLabel}
      gap="$sm"
      flexShrink={1}
      minHeight={0}
    >
      {keyRows.map((keys) => (
        <Row
          key={keys.join()}
          gap="$sm"
          height="$key"
          minHeight="$keyMin"
          flexShrink={1}
          alignItems="stretch"
        >
          {keys.map((key) => (
            <Pressable
              key={key}
              testID={`key-${key}`}
              flex={1}
              justifyContent="center"
              borderRadius="$key"
              backgroundColor={
                key === "backspace" || key === "decimal"
                  ? "$transparent"
                  : "$neutralSoft"
              }
              hoverStyle={{ backgroundColor: "$backgroundPress" }}
              pressStyle={{
                backgroundColor: "$backgroundPress",
                scale: 0.96,
                opacity: opacity.dimmed,
              }}
              transition="fast"
              disabled={disabled}
              aria-label={
                key === "decimal"
                  ? labels.decimal
                  : key === "backspace"
                    ? labels.backspace
                    : key
              }
              onPress={() => onKeyPress(key)}
            >
              {key === "backspace" ? (
                <Icon name="Delete" size="lg" color="$colorSubtle" />
              ) : (
                <Text
                  variant="heading"
                  fontWeight="$semibold"
                  color="$colorStrong"
                  textAlign="center"
                  fontVariant={["tabular-nums"]}
                >
                  {key === "decimal" ? decimalSymbol : key}
                </Text>
              )}
            </Pressable>
          ))}
        </Row>
      ))}
    </Stack>
  );
}

interface QRCodeBaseProps {
  value: string;
  accessibilityLabel: string;
  /** A logo in a cleared centre: the brand mark or an icon such as "Zap". */
  logo?: "brand" | IconName | undefined;
  /** The largest the code grows: `md` for side content, `lg` for a code the customer scans. */
  size?: "md" | "lg" | undefined;
  /** A browser tooltip on the web; ignored on native. */
  tooltip?: string | undefined;
  testID?: string | undefined;
}

export type QRCodeProps = QRCodeBaseProps &
  (
    | {
        /** Makes the code pressable, e.g. to copy its content. */
        onPress?: (() => void) | undefined;
        enlarge?: undefined;
      }
    | {
        /** Pressing the code shows it full screen on white, closed by the X labelled `closeLabel` or a tap. */
        enlarge: { readonly closeLabel: string };
        onPress?: undefined;
      }
  );

/** The white frame's padding (the quiet zone) and hairline border on both sides. */
const qrFrameInset = 2 * (space.lg + border.hairline);

/**
 * A black-on-white QR code with a quiet zone, scannable in both themes.
 * It fills the available width up to its size, so dense codes get as many pixels per module as fit.
 */
export function QRCode({
  value,
  accessibilityLabel,
  onPress,
  enlarge,
  logo,
  size = "md",
  tooltip,
  testID,
}: QRCodeProps) {
  const [availableWidth, setAvailableWidth] = useState<number>();
  const [enlarged, setEnlarged] = useState(false);
  const maxSize = size === "lg" ? sizes.qrLg : sizes.qr;
  const codeSize =
    availableWidth === undefined
      ? maxSize
      : Math.max(0, Math.min(maxSize, availableWidth - qrFrameInset));
  const press = enlarge ? () => setEnlarged(true) : onPress;
  const Frame = press ? Pressable : View;
  return (
    <View
      alignSelf="stretch"
      alignItems="center"
      // Hidden until measured, so the code never flashes at the wrong size.
      opacity={availableWidth === undefined ? 0 : 1}
      onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
    >
      <Frame
        testID={testID}
        role={press ? "button" : "img"}
        aria-label={accessibilityLabel}
        {...tooltipProps(tooltip)}
        onPress={press}
        position="relative"
        padding="$lg"
        borderRadius="$card"
        backgroundColor="$qrBackground"
        borderWidth={border.hairline}
        borderColor="$borderColor"
        alignSelf="center"
        {...(press ? { pressStyle: { opacity: opacity.dimmed } } : {})}
      >
        <QRSymbol value={value} size={codeSize} logo={logo} />
      </Frame>
      {enlarge ? (
        <QRViewer
          open={enlarged}
          onOpenChange={setEnlarged}
          value={value}
          accessibilityLabel={accessibilityLabel}
          logo={logo}
          closeLabel={enlarge.closeLabel}
          testID={testID === undefined ? undefined : `${testID}-enlarged`}
        />
      ) : null}
    </View>
  );
}

/** The modules and the logo, `size` wide. */
function QRSymbol({
  value,
  size,
  logo,
}: {
  value: string;
  size: number;
  logo: QRCodeProps["logo"];
}) {
  const theme = useTheme();
  return (
    <View position="relative">
      <QRCodeSvg
        value={value}
        size={size}
        color={getVariableValue(theme.qrForeground)}
        backgroundColor={getVariableValue(theme.qrBackground)}
        // The logo hides the centre modules and needs the highest level; without one, the lowest level keeps long payloads coarse.
        ecl={logo ? "H" : "L"}
      />
      {logo ? (
        <View
          position="absolute"
          inset={0}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <View
            padding="$xs"
            borderRadius="$control"
            backgroundColor="$qrBackground"
          >
            {logo === "brand" ? (
              <BrandMark size="iconXl" />
            ) : (
              <View
                width="$iconXl"
                height="$iconXl"
                borderRadius="$sm"
                backgroundColor="$qrForeground"
                alignItems="center"
                justifyContent="center"
              >
                <Icon name={logo} color="$qrBackground" />
              </View>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The code as large as the screen allows, on white; a tap anywhere closes it. */
function QRViewer({
  open,
  onOpenChange,
  value,
  accessibilityLabel,
  logo,
  closeLabel,
  testID,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  accessibilityLabel: string;
  logo: QRCodeProps["logo"];
  closeLabel: string;
  testID: string | undefined;
}) {
  const [area, setArea] = useState<{ width: number; height: number }>();
  const close = () => onOpenChange(false);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement="qr"
      described={false}
      testID={testID}
    >
      {/* Light, so the controls read on the white screen in the dark theme too. */}
      <Theme name="light">
        <VisuallyHidden>
          <TamaguiDialog.Title>{accessibilityLabel}</TamaguiDialog.Title>
        </VisuallyHidden>
        <Row justifyContent="flex-end">
          <IconButton
            icon="X"
            accessibilityLabel={closeLabel}
            onPress={close}
          />
        </Row>
        <View
          position="relative"
          flex={1}
          alignItems="center"
          justifyContent="center"
          onLayout={(event) => setArea(event.nativeEvent.layout)}
        >
          <Pressable
            position="absolute"
            inset={0}
            cursor="default"
            aria-hidden
            tabIndex={-1}
            onPress={close}
          />
          {area ? (
            <View pointerEvents="none">
              <QRSymbol
                value={value}
                size={Math.max(0, Math.min(area.width, area.height))}
                logo={logo}
              />
            </View>
          ) : null}
        </View>
      </Theme>
    </Modal>
  );
}

export interface SuccessOverlayProps {
  title: string;
  /** The formatted amount, e.g. "1 250,50". */
  amount?: string | undefined;
  unit?: string | undefined;
  /** A line under the amount, e.g. the method and time. */
  detail?: string | undefined;
  /** The way on, e.g. "New payment"; pressing the backdrop also dismisses. */
  action?: LabeledAction | undefined;
  onDismiss?: (() => void) | undefined;
  /** Renders in place, filling the nearest positioned parent, instead of portaling over the whole app. */
  contained?: boolean | undefined;
}

/** A paid confirmation: the check pops in on a green disc, then the amount. */
export function SuccessOverlay({
  title,
  amount,
  unit,
  detail,
  action,
  onDismiss,
  contained = false,
}: SuccessOverlayProps) {
  const overlay = (
    <View
      position="absolute"
      inset={0}
      zIndex="$overlay"
      justifyContent="center"
      padding="$xl"
      role="status"
      aria-live="assertive"
      // The portal host turns pointer events off for everything inside it.
      pointerEvents="auto"
    >
      <Pressable
        position="absolute"
        inset={0}
        cursor="default"
        backgroundColor="$scrim"
        aria-hidden
        tabIndex={-1}
        onPress={onDismiss}
        transition="fast"
        enterStyle={{ opacity: 0 }}
      />
      <Stack
        position="relative"
        alignItems="center"
        gap="$lg"
        width="100%"
        maxWidth="$narrowWidth"
        alignSelf="center"
        padding="$xxl"
        paddingTop="$xxxl"
        borderRadius="$sheet"
        backgroundColor="$surface"
        boxShadow={shadow.floating}
        transition="slow"
        enterStyle={{ opacity: 0, scale: enterScale.subtle, y: 24 }}
      >
        <View
          position="relative"
          width="$hero"
          height="$hero"
          alignItems="center"
          justifyContent="center"
        >
          <View
            position="absolute"
            inset={0}
            borderRadius="$pill"
            backgroundColor="$successSoft"
            transition={["slow", { delay: 120 }]}
            enterStyle={{ opacity: 0, scale: enterScale.pop }}
          />
          <View
            width="$controlLg"
            height="$controlLg"
            borderRadius="$pill"
            backgroundColor="$success"
            alignItems="center"
            justifyContent="center"
            transition="slow"
            enterStyle={{ scale: 0 }}
          >
            <View
              transition={["slow", { delay: 200 }]}
              enterStyle={{
                opacity: 0,
                scale: enterScale.pop,
                rotate: "-45deg",
              }}
            >
              <Icon name="Check" size="lg" color="$onSuccess" />
            </View>
          </View>
        </View>
        <Text variant="heading" textAlign="center">
          {title}
        </Text>
        {amount ? <AmountDisplay value={amount} unit={unit} size="md" /> : null}
        {detail ? (
          <Text muted textAlign="center">
            {detail}
          </Text>
        ) : null}
        {action ? (
          <Button
            size="lg"
            alignSelf="stretch"
            marginTop="$sm"
            onPress={action.onPress}
          >
            {action.label}
          </Button>
        ) : null}
      </Stack>
    </View>
  );
  return contained ? overlay : <Portal zIndex="$overlay">{overlay}</Portal>;
}
