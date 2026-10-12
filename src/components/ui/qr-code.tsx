"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface QRCodeProps {
  /** Pre-rendered PNG data URL (e.g. from /api/me/registrations/{id}/qr)… */
  dataUrl?: string;
  /** …or a value to encode client-side (lazy-loads the qrcode library). */
  value?: string;
  label: string;
  size?: number;
  className?: string;
}

/** High-contrast QR on a white tile (scannable in dark mode too). */
export function QRCode({ dataUrl, value, label, size = 240, className }: QRCodeProps) {
  const [generated, setGenerated] = useState<string | null>(null);

  useEffect(() => {
    if (dataUrl || !value) return;
    let cancelled = false;
    void import("qrcode").then(({ toDataURL }) =>
      toDataURL(value, { errorCorrectionLevel: "M", margin: 1, width: size * 2 }).then((url) => {
        if (!cancelled) setGenerated(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [dataUrl, value, size]);

  const src = dataUrl ?? generated;
  return (
    <div className={cn("inline-flex rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/5", className)} style={{ width: size + 24, height: size + 24 }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URL, nothing for next/image to optimise
        <img src={src} alt={label} width={size} height={size} className="size-full [image-rendering:pixelated]" />
      ) : (
        <Skeleton className="size-full rounded-lg" />
      )}
    </div>
  );
}
