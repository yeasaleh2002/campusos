"use client";

import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, CalendarPlus, CircleCheck, QrCode, Ticket, XCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { type EventCardData } from "@/components/features/events/event-card";
import { useEventRegistration, useToggleSave } from "@/components/features/events/event-hooks";
import { TicketDialog } from "@/components/features/events/ticket-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { ShareButton } from "@/components/shared/share-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useCountdown } from "@/hooks/use-countdown";
import { api } from "@/lib/api-client";
import { buildIcs, downloadFile, googleCalendarUrl } from "@/lib/calendar";
import { formatDateTime } from "@/lib/format";
import { REGISTRATION_BLOCKER_MESSAGES, type RegistrationBlocker, registrationBlocker } from "@/server/domain/event-registration";

export interface EventPanelData extends EventCardData {
  description: string;
  registrationDeadline: string | null;
  startAt: string;
  endAt: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

function Countdown({ startAt, endAt }: { startAt: string; endAt: string }) {
  const toStart = useCountdown(startAt);
  const toEnd = useCountdown(endAt);
  if (!toStart || !toEnd) return <div className="h-[4.5rem]" aria-hidden />;
  if (toEnd.done) return <p className="font-semibold text-fg-muted">This event has ended.</p>;
  if (toStart.done) return <p className="font-semibold text-success">Happening now</p>;
  const cells = [
    ["Days", toStart.days],
    ["Hours", toStart.hours],
    ["Mins", toStart.minutes],
    ["Secs", toStart.seconds],
  ] as const;
  return (
    <div role="timer" aria-label="Time until the event starts" className="grid grid-cols-4 gap-2 text-center">
      {cells.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-surface-2 px-1 py-2.5">
          <div className="font-display text-2xl font-bold tabular-nums">{pad(value)}</div>
          <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-fg-subtle">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** Live registration card: countdown, seats, register / cancel (optimistic), QR, calendar, save, share. */
export function EventPanel({ initial }: { initial: EventPanelData }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ticketOpen, setTicketOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const live = useQuery({
    queryKey: ["event", initial.slug],
    queryFn: () => api.get<EventPanelData>(`/api/events/${initial.slug}`),
    initialData: initial,
    staleTime: 15_000,
  });
  const event = live.data;
  const spotsLeft = event.capacity === null ? null : Math.max(0, event.capacity - event.registrationCount);

  const { registration, register, cancel, pending, loading } = useEventRegistration({ ...event, spotsLeft });
  const { isSaved, toggle, pending: savePending } = useToggleSave({ ...event, spotsLeft });

  // The deadline check needs "now": evaluated on interaction + render in the browser only.
  const blocker: RegistrationBlocker | null = registrationBlocker(
    {
      status: event.status as "PUBLISHED",
      startAt: new Date(event.startAt),
      endAt: new Date(event.endAt),
      registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline) : null,
      capacity: event.capacity,
      registrationCount: event.registrationCount,
    },
    registration ? "REGISTERED" : null,
    new Date(),
  );

  const requireLogin = () => router.push(`/login?next=${encodeURIComponent(pathname)}`);
  const calendarEntry = { uid: event.id, title: event.title, description: event.description.slice(0, 500), location: event.venue, start: event.startAt, end: event.endAt, url: typeof window === "undefined" ? undefined : window.location.href };

  const onRegister = () => {
    if (!user) return requireLogin();
    register()
      .then(() => setTicketOpen(true))
      .catch(() => undefined);
  };

  const capacityPercent = event.capacity ? Math.min(100, Math.round((event.registrationCount / event.capacity) * 100)) : 0;

  return (
    <aside className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-md lg:sticky lg:top-24" aria-label="Registration">
      <Countdown startAt={event.startAt} endAt={event.endAt} />

      {event.capacity !== null && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold">{event.registrationCount} / {event.capacity} registered</span>
            <span className={spotsLeft === 0 ? "font-semibold text-danger" : "text-fg-muted"}>{spotsLeft === 0 ? "Full" : `${spotsLeft} left`}</span>
          </div>
          <Progress value={capacityPercent} label="Seats taken" tone={capacityPercent >= 90 ? "danger" : capacityPercent >= 70 ? "warning" : "primary"} />
        </div>
      )}

      {registration ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-sm font-semibold text-success">
            <CircleCheck className="size-4" /> {registration.status === "CHECKED_IN" ? "Checked in - enjoy the event!" : "You're going"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" onClick={() => setTicketOpen(true)} disabled={registration.id.startsWith("optimistic")}>
              <QrCode /> Show QR ticket
            </Button>
            {registration.status === "REGISTERED" && new Date(event.startAt) > new Date() && (
              <Button variant="ghost" onClick={() => setConfirmCancel(true)} disabled={pending}>
                <XCircle /> Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button variant="gradient" size="lg" className="w-full" onClick={onRegister} disabled={Boolean(blocker) || pending || status === "loading" || loading} loading={pending}>
            <Ticket /> {blocker ? "Registration unavailable" : user ? "Register now" : "Sign in to register"}
          </Button>
          {blocker && <p className="text-center text-sm text-fg-muted">{REGISTRATION_BLOCKER_MESSAGES[blocker]}</p>}
          {!blocker && event.registrationDeadline && <p className="text-center text-xs text-fg-subtle">Registration closes {formatDateTime(event.registrationDeadline)}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={isSaved}
          disabled={savePending}
          onClick={() => {
            if (!user) return requireLogin();
            toggle().catch(() => undefined);
          }}
        >
          {isSaved ? <BookmarkCheck /> : <Bookmark />} {isSaved ? "Saved" : "Save"}
        </Button>
        <DropdownMenu
          trigger={({ toggle: open, id }) => (
            <Button variant="secondary" size="sm" onClick={open} aria-haspopup="menu" id={id}>
              <CalendarPlus /> Add to calendar
            </Button>
          )}
          items={[
            { type: "action", label: "Download .ics file", onSelect: () => downloadFile(`${event.slug}.ics`, buildIcs(calendarEntry)) },
            { type: "link", label: "Google Calendar", href: googleCalendarUrl(calendarEntry), external: true },
          ]}
        />
        <ShareButton size="sm" title={event.title} text={`${event.title} at City University`} />
      </div>

      <TicketDialog open={ticketOpen} onClose={() => setTicketOpen(false)} registrationId={registration?.id ?? null} eventTitle={event.title} startAt={event.startAt} venue={event.venue} />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel your registration?"
        description="Your seat will be released and your QR ticket stops working. You can register again if seats are still available."
        confirmLabel="Cancel registration"
        destructive
        loading={pending}
        onConfirm={() => {
          cancel()
            .catch(() => undefined)
            .finally(() => setConfirmCancel(false));
        }}
      />
    </aside>
  );
}
