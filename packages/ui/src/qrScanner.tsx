import { ScannerFrame } from "./scanner";

export interface QRScannerProps {
  /** Called with the text of each newly read code; reading the same code again does not repeat it. */
  onScan: (text: string) => void;
  accessibilityLabel: string;
  /** A line under the frame while the camera runs, e.g. "Point the camera at a Linky profile QR". */
  hint?: string | undefined;
  /** Shown instead when there is no camera or the user denied it. */
  unavailableHint: string;
}

/** Native has no camera support yet; the web build uses `qrScanner.web.tsx`. */
export function QRScanner({
  accessibilityLabel,
  unavailableHint,
}: QRScannerProps) {
  return (
    <ScannerFrame
      accessibilityLabel={accessibilityLabel}
      hint={unavailableHint}
    />
  );
}
