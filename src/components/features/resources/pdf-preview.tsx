"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Inline PDF viewer (browser-native). Loaded lazily, only after the user asks for a preview. */
export function PdfPreview({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <section aria-label={`Preview of ${title}`} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="truncate text-sm font-semibold">Preview</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close preview">
          <X />
        </Button>
      </div>
      <iframe src={`${url}#toolbar=1&view=FitH`} title={`PDF preview: ${title}`} loading="lazy" className="h-[70dvh] w-full bg-surface-2" referrerPolicy="no-referrer" />
    </section>
  );
}
