"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { QRCode } from "@/components/ui/qr-code";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { downloadFile } from "@/lib/calendar";
import { formatDateTime } from "@/lib/format";

interface TicketDialogProps {
  open: boolean;
  onClose: () => void;
  registrationId: string | null;
  eventTitle: string;
  startAt: string | Date;
  venue: string;
}

interface QrResponse {
  registrationId: string;
  status: string;
  qrDataUrl: string;
}

/** QR ticket for door check-in. Download saves the PNG for offline use. */
export function TicketDialog({ open, onClose, registrationId, eventTitle, startAt, venue }: TicketDialogProps) {
  const ready = open && Boolean(registrationId) && !registrationId?.startsWith("optimistic");
  const qr = useQuery({
    queryKey: ["me", "registrations", "qr", registrationId],
    enabled: ready,
    queryFn: () => api.get<QrResponse>(`/api/me/registrations/${registrationId}/qr`),
    staleTime: 10 * 60_000,
  });

  const download = async () => {
    if (!qr.data) return;
    const blob = await (await fetch(qr.data.qrDataUrl)).blob();
    downloadFile(`campusos-ticket-${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png`, blob, "image/png");
  };

  return (
    <Dialog open={open} onClose={onClose} title="Your QR ticket" description="Show this at the door. Keep your screen brightness up.">
      <div className="flex flex-col items-center gap-4 pb-6 text-center">
        {qr.isError ? (
          <ErrorState error={qr.error} onRetry={() => void qr.refetch()} />
        ) : (
          <QRCode dataUrl={qr.data?.qrDataUrl} label={`QR ticket for ${eventTitle}`} size={220} />
        )}
        <div>
          <p className="font-display text-base font-semibold">{eventTitle}</p>
          <p className="text-sm text-fg-muted">
            {formatDateTime(startAt)} · {venue}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void download()} disabled={!qr.data}>
          <Download /> Download PNG
        </Button>
      </div>
    </Dialog>
  );
}
