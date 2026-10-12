"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CalendarX2, QrCode, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EventCard } from "@/components/features/events/event-card";
import { type MyRegistrationRow } from "@/components/features/events/event-hooks";
import { TicketDialog } from "@/components/features/events/ticket-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListView } from "@/components/ui/list-view";
import { Tabs } from "@/components/ui/tabs";
import { useCursorList } from "@/hooks/use-cursor-list";
import { api } from "@/lib/api-client";
import { REGISTRATION_STATUS, labelOf } from "@/lib/labels";
import { queryKeys } from "@/lib/query-client";
import { toastPromise } from "@/lib/toast";

const TABS = [
  { value: "REGISTERED", label: "Upcoming" },
  { value: "CHECKED_IN", label: "Attended" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/** The signed-in user's tickets: QR dialog + cancel with confirmation. */
export function MyRegistrations() {
  const [tab, setTab] = useState<Tab>("REGISTERED");
  const [ticket, setTicket] = useState<MyRegistrationRow | null>(null);
  const [cancelling, setCancelling] = useState<MyRegistrationRow | null>(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const list = useCursorList<MyRegistrationRow>(queryKeys.myRegistrations(tab), "/api/me/registrations", { query: { status: tab } });

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await toastPromise(api.delete(`/api/events/${cancelling.event.id}/register`), { loading: "Cancelling…", success: "Registration cancelled." });
      await queryClient.invalidateQueries({ queryKey: ["me", "registrations"] });
      setCancelling(null);
    } catch {
      // toast already shown
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs label="Registration status" items={[...TABS]} value={tab} onValueChange={setTab} />
      <ListView
        list={list}
        getKey={(row) => row.id}
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        renderItem={(row) => {
          const status = labelOf(REGISTRATION_STATUS, row.status);
          const upcoming = new Date(row.event.startAt) > new Date();
          return (
            <EventCard
              event={row.event}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {row.status !== "CANCELLED" && (
                    <Button size="sm" variant="soft" onClick={() => setTicket(row)}>
                      <QrCode /> Ticket
                    </Button>
                  )}
                  {row.status === "REGISTERED" && upcoming && (
                    <Button size="sm" variant="ghost" onClick={() => setCancelling(row)}>
                      <XCircle /> Cancel
                    </Button>
                  )}
                </div>
              }
            />
          );
        }}
        empty={{
          title: tab === "REGISTERED" ? "No upcoming tickets" : tab === "CHECKED_IN" ? "No attended events yet" : "No cancelled registrations",
          description: "Browse events and register - your QR ticket will show up here.",
          icon: <CalendarX2 />,
          action: (
            <Button asChild variant="gradient">
              <Link href="/events">Browse events</Link>
            </Button>
          ),
        }}
      />
      <TicketDialog
        open={Boolean(ticket)}
        onClose={() => setTicket(null)}
        registrationId={ticket?.id ?? null}
        eventTitle={ticket?.event.title ?? ""}
        startAt={ticket?.event.startAt ?? new Date()}
        venue={ticket?.event.venue ?? ""}
      />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel this registration?"
        description={cancelling ? `Your seat for “${cancelling.event.title}” will be released.` : ""}
        confirmLabel="Cancel registration"
        destructive
        loading={busy}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  );
}
