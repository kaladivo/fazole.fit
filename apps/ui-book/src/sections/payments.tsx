import { useState } from "react";
import * as UI from "@platitprosim/ui";
import type { Section } from "../section";
import { bip321Payload, spdPayload } from "../sample-data";

const applyKey = (amount: string, key: UI.KeypadKey) =>
  key === "backspace"
    ? amount.slice(0, -1)
    : key === "decimal"
      ? amount.includes(",")
        ? amount
        : `${amount || "0"},`
      : `${amount === "0" ? "" : amount}${key}`;

export const payments: Section = {
  title: "Payments",
  entries: {
    Keypad: () => {
      const [amount, setAmount] = useState("");
      return (
        <UI.Stack maxWidth="$narrowWidth" width="100%" alignSelf="center">
          <UI.AmountDisplay
            value={amount || "0"}
            unit="Kč"
            placeholder={amount === ""}
            live
          />
          <UI.Keypad
            accessibilityLabel="Amount"
            labels={{ decimal: "Decimal comma", backspace: "Delete" }}
            onKeyPress={(key) => setAmount((current) => applyKey(current, key))}
          />
        </UI.Stack>
      );
    },
    QRCode: () => (
      <UI.Row flexWrap="wrap" justifyContent="center" alignItems="flex-start">
        <UI.Stack alignItems="center" gap="$sm">
          <UI.QRCode
            value={spdPayload}
            accessibilityLabel="Bank payment QR code"
            logo="Landmark"
          />
          <UI.Text variant="caption" muted>
            SPD with an icon
          </UI.Text>
        </UI.Stack>
        <UI.Stack alignItems="center" gap="$sm">
          <UI.QRCode
            value={bip321Payload}
            accessibilityLabel="Bitcoin payment QR code, press to copy"
            logo="brand"
            onPress={() => {}}
            tooltip="Copy"
          />
          <UI.Text variant="caption" muted>
            BIP-321 with the brand, pressable
          </UI.Text>
        </UI.Stack>
      </UI.Row>
    ),
    ScannerFrame: () => {
      const [detected, setDetected] = useState(false);
      return (
        <UI.Stack>
          <UI.ScannerFrame
            accessibilityLabel="Camera"
            hint="Point the camera at the employee's Linky profile QR."
            detected={detected}
          />
          <UI.Button
            variant="secondary"
            size="sm"
            alignSelf="center"
            onPress={() => setDetected(!detected)}
          >
            Toggle detected
          </UI.Button>
        </UI.Stack>
      );
    },
    QRScanner: () => {
      const [scanning, setScanning] = useState(false);
      const [scanned, setScanned] = useState<string>();
      return (
        <UI.Stack alignItems="center">
          {scanning ? (
            <UI.QRScanner
              accessibilityLabel="Camera"
              hint="Point the camera at a QR code."
              unavailableHint="The camera is not available. Allow it, or open the book over HTTPS."
              onScan={setScanned}
            />
          ) : (
            <UI.ScannerFrame
              accessibilityLabel="Camera off"
              hint="The scanner asks for the camera when it mounts."
            />
          )}
          <UI.Button
            variant="secondary"
            size="sm"
            icon="Camera"
            onPress={() => setScanning(!scanning)}
          >
            {scanning ? "Stop camera" : "Start camera"}
          </UI.Button>
          {scanned ? (
            <UI.Text mono variant="caption" textAlign="center">
              {scanned}
            </UI.Text>
          ) : null}
        </UI.Stack>
      );
    },
  },
};
