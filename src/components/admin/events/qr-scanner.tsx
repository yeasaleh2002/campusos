"use client";

import { CameraOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface QrScannerProps {
  onScan: (value: string) => void;
  /** Stops decoding while a result is being processed. */
  paused: boolean;
}

const SCAN_INTERVAL_MS = 120;

/**
 * Camera QR scanner. Uses the native BarcodeDetector where available (Chromium) and
 * falls back to jsQR on a canvas everywhere else (Safari, Firefox). Loaded lazily
 * by the check-in page, so the decoder never reaches other admin screens.
 */
export default function QrScanner({ onScan, paused }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(paused);
  const onScanRef = useRef(onScan);
  const [state, setState] = useState<"starting" | "ready" | "denied">("starting");

  useEffect(() => {
    pausedRef.current = paused;
    onScanRef.current = onScan;
  }, [paused, onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        const video = videoRef.current;
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();
        setState("ready");

        const native = window.BarcodeDetector && (await window.BarcodeDetector.getSupportedFormats()).includes("qr_code") ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
        const decodeWithJsQr = native ? null : (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });

        const tick = async () => {
          if (cancelled) return;
          if (!pausedRef.current && video.readyState === video.HAVE_ENOUGH_DATA) {
            try {
              if (native) {
                const [code] = await native.detect(video);
                if (code) onScanRef.current(code.rawValue);
              } else if (decodeWithJsQr && context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0);
                const frame = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = decodeWithJsQr(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
                if (code) onScanRef.current(code.data);
              }
            } catch {
              // A bad frame is skipped.
            }
          }
          timer = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS);
        };
        void tick();
      } catch {
        if (!cancelled) setState("denied");
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (state === "denied") {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-border bg-surface-2 p-6 text-center">
        <CameraOff className="mb-3 size-10 text-fg-subtle" aria-hidden />
        <p className="font-semibold">Camera unavailable</p>
        <p className="mt-1 text-sm text-fg-muted">Allow camera access in your browser, or enter the ticket code manually.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
      {state === "starting" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-surface-2">
          <Loader2 className="size-8 animate-spin text-primary" aria-label="Starting camera" />
        </div>
      )}
      <video ref={videoRef} muted playsInline aria-label="Camera preview for scanning QR tickets" className="h-72 w-full object-cover sm:h-96" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
        <div className="relative size-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] sm:size-56">
          <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse rounded bg-accent" />
        </div>
      </div>
    </div>
  );
}
