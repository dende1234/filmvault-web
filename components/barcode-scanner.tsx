"use client";

import { useEffect, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { useHasCamera } from "@/lib/use-has-camera";
import { isValidEanUpc, normalizeBarcode } from "@/lib/barcode";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Minimal typing for the (Chromium-only) Shape Detection API.
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

// Film/series cases carry EAN-13 (Europe) or UPC-A (US); EAN-8 is rare but valid.
const FORMATS = ["ean_13", "upc_a", "ean_8"];

/** "Scan barcode" button + camera dialog. Renders NOTHING on devices
 * without a camera (useHasCamera), so the rest of the UI stays the typed
 * barcode field. Video frames are decoded in the browser only — nothing is
 * sent or stored. Uses the native BarcodeDetector where available
 * (Chrome/Android) and lazy-loads @zxing/browser otherwise (Safari/iOS). */
export function BarcodeScanButton({
  onDetected,
  variant = "secondary",
  size,
  iconOnly = false,
  className,
}: {
  onDetected: (barcode: string) => void;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconOnly?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const hasCamera = useHasCamera();
  const [open, setOpen] = useState(false);
  if (!hasCamera) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : size}
        onClick={() => setOpen(true)}
        aria-label={t("scanner_button")}
        className={className}
      >
        <ScanBarcode />
        {!iconOnly && t("scanner_button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("scanner_title")}</DialogTitle>
            <DialogDescription>{t("scanner_hint")}</DialogDescription>
          </DialogHeader>
          {open && (
            <ScannerView
              onDetected={(code) => {
                setOpen(false);
                onDetected(code);
              }}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Mounted only while the dialog is open: starts the camera on mount and
 * always releases it on unmount. */
function ScannerView({ onDetected, onCancel }: { onDetected: (barcode: string) => void; onCancel: () => void }) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<"denied" | "failed" | null>(null);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let zxingStop: (() => void) | null = null;

    function finish(raw: string) {
      const code = normalizeBarcode(raw);
      // A checksum match filters out partial/misread frames.
      if (stopped || !isValidEanUpc(code)) return;
      stopped = true;
      navigator.vibrate?.(60);
      onDetectedRef.current(code);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = stream;
        await video.play();

        const Native = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        const supported = Native ? ((await Native.getSupportedFormats?.()) ?? FORMATS) : [];
        const formats = FORMATS.filter((f) => supported.includes(f));
        if (Native && formats.length > 0) {
          const detector = new Native({ formats });
          timer = setInterval(async () => {
            if (stopped || video.readyState < 2) return;
            try {
              const found = await detector.detect(video);
              if (found[0]) finish(found[0].rawValue);
            } catch {
              // A frame can fail to decode; keep scanning.
            }
          }, 250);
        } else {
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
          ]);
          if (stopped) return;
          const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.EAN_8]]]);
          const reader = new BrowserMultiFormatReader(hints);
          const controls = await reader.decodeFromVideoElement(video, (result) => {
            if (result) finish(result.getText());
          });
          zxingStop = () => controls.stop();
          if (stopped) zxingStop();
        }
      } catch (e) {
        if (!stopped) setError(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "failed");
      }
    }

    start();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      zxingStop?.();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">{t(error === "denied" ? "scanner_denied" : "scanner_failed")}</p>
        <Button variant="secondary" onClick={onCancel} className="w-fit">
          {t("scanner_type_instead")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} playsInline muted className="size-full object-cover" data-testid="scanner-video" />
        {/* Aiming frame */}
        <div aria-hidden className="pointer-events-none absolute inset-x-[12%] top-1/2 h-1/3 -translate-y-1/2 rounded-lg border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
      <Button variant="ghost" onClick={onCancel} className="w-fit">
        {t("scanner_type_instead")}
      </Button>
    </div>
  );
}
