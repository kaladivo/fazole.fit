import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import type { QRScannerProps } from "./qrScanner";
import { ScannerFrame } from "./scanner";

/** Frames are scaled down to this width before decoding; QR codes held up to a camera stay readable. */
const DECODE_WIDTH = 640;

const decodeFrame = (
  video: HTMLVideoElement,
  context: CanvasRenderingContext2D,
): string | null => {
  const scale = Math.min(1, DECODE_WIDTH / video.videoWidth);
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);
  if (width === 0 || height === 0) return null;
  context.canvas.width = width;
  context.canvas.height = height;
  context.drawImage(video, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  return (
    jsQR(data, width, height, { inversionAttempts: "dontInvert" })?.data || null
  );
};

/** The rear camera inside a `ScannerFrame`, decoding QR codes with jsQR. */
export function QRScanner({
  onScan,
  accessibilityLabel,
  hint,
  unavailableHint,
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [unavailable, setUnavailable] = useState(false);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setUnavailable(true);
      return;
    }
    let stopped = false;
    let frame = 0;
    let stream: MediaStream | undefined;
    let context: CanvasRenderingContext2D | null = null;
    let last: string | null = null;
    const scan = () => {
      if (stopped) return;
      context ??= document
        .createElement("canvas")
        .getContext("2d", { willReadFrequently: true });
      const text =
        context && video.readyState >= video.HAVE_CURRENT_DATA
          ? decodeFrame(video, context)
          : null;
      if (text !== null && text !== last) {
        last = text;
        setDetected(true);
        onScanRef.current(text);
      }
      frame = requestAnimationFrame(scan);
    };
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        stream = media;
        if (stopped) return;
        video.srcObject = media;
        video.play().catch(() => {});
        frame = requestAnimationFrame(scan);
      })
      .catch(() => setUnavailable(true));
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, []);

  return (
    <ScannerFrame
      accessibilityLabel={accessibilityLabel}
      hint={unavailable ? unavailableHint : hint}
      detected={detected}
    >
      {unavailable ? undefined : (
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
    </ScannerFrame>
  );
}
