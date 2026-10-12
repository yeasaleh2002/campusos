"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Keyboard, ScanLine, Search, ShieldAlert, XCircle } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AdminPage, Panel } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { ApiClientError, api, errorMessage } from "@/lib/api-client";
import { formatTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const QrScanner = dynamic(() => import("@/components/admin/events/qr-scanner"), { ssr: false, loading: () => <Skeleton className="h-72 rounded-2xl sm:h-96" /> });

interface EventStats {
  capacity: number | null;
  registered: number;
  checkedIn: number;
  cancelled: number;
}

interface CheckInResult {
  registrationId: string;
  checkedInAt: string;
  attendee: { name: string; email: string; studentId: string | null; department: { code: string } | null };
}

interface Attendee {
  id: string;
  status: "REGISTERED" | "CHECKED_IN" | "CANCELLED";
  user: { name: string; email: string; studentId: string | null; department: { code: string } | null };
}

type Outcome = { kind: "success" | "duplicate" | "invalid"; title: string; detail: string };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const SCAN_COOLDOWN_MS = 3000;

/** Short success/error tones through the Web Audio API (no audio files to download). */
function beep(kind: Outcome["kind"]) {
  try {
    const context = new AudioContext();
    const tones = kind === "success" ? [[880, 0, 0.12]] : [[220, 0, 0.14], [220, 0.2, 0.14]];
    for (const [frequency, start, length] of tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.12;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + length);
    }
    window.setTimeout(() => void context.close(), 700);
  } catch {
    // Audio is a nicety; some browsers block it until a gesture.
  }
}

function feedback(outcome: Outcome) {
  beep(outcome.kind);
  if ("vibrate" in navigator) navigator.vibrate(outcome.kind === "success" ? [60] : [120, 60, 120]);
  if (outcome.kind === "success") toast.success(`${outcome.title} checked in`);
  else toast.error(outcome.detail);
}

const OUTCOME_STYLE: Record<Outcome["kind"], { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "border-success/40 bg-success-soft text-success" },
  duplicate: { icon: ShieldAlert, className: "border-warning/40 bg-warning-soft text-warning" },
  invalid: { icon: XCircle, className: "border-danger/40 bg-danger-soft text-danger" },
};

export function LiveCheckIn({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"scan" | "code" | "find">("scan");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [recent, setRecent] = useState<Array<Outcome & { at: string }>>([]);
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const lastScan = useRef<{ value: string; at: number } | null>(null);

  const event = useQuery({ queryKey: ["admin", "event", eventId], queryFn: () => api.get<{ title: string; venue: string }>(`/api/admin/events/${eventId}`) });
  const stats = useQuery({ queryKey: ["admin", "event-stats", eventId], queryFn: () => api.get<EventStats>(`/api/admin/events/${eventId}/stats`), refetchInterval: 5000 });
  const attendees = useQuery({
    queryKey: ["admin", "event-find", eventId, query],
    enabled: mode === "find" && query.length >= 2,
    queryFn: () => api.get<Attendee[]>(`/api/admin/events/${eventId}/registrations`, { query: { q: query, status: "REGISTERED", limit: 10 } }),
  });

  const record = useCallback(
    (next: Outcome) => {
      setOutcome(next);
      setRecent((list) => [{ ...next, at: new Date().toISOString() }, ...list].slice(0, 8));
      feedback(next);
      void queryClient.invalidateQueries({ queryKey: ["admin", "event-stats", eventId] });
    },
    [eventId, queryClient],
  );

  const run = useCallback(
    async (request: () => Promise<CheckInResult>) => {
      setBusy(true);
      try {
        const result = await request();
        record({ kind: "success", title: result.attendee.name, detail: [result.attendee.studentId, result.attendee.department?.code].filter(Boolean).join(" · ") || result.attendee.email });
      } catch (error) {
        const duplicate = error instanceof ApiClientError && error.code === "ALREADY_CHECKED_IN";
        const at = duplicate && error instanceof ApiClientError && typeof (error.details as { checkedInAt?: string } | undefined)?.checkedInAt === "string" ? ` at ${formatTime((error.details as { checkedInAt: string }).checkedInAt)}` : "";
        record({ kind: duplicate ? "duplicate" : "invalid", title: duplicate ? "Already checked in" : "Not valid", detail: duplicate ? `This ticket was already used${at}.` : errorMessage(error) });
      } finally {
        setBusy(false);
      }
    },
    [record],
  );

  const submitToken = useCallback(
    (raw: string) => {
      const value = raw.trim();
      const previous = lastScan.current;
      if (busy || (previous && previous.value === value && Date.now() - previous.at < SCAN_COOLDOWN_MS)) return;
      lastScan.current = { value, at: Date.now() };
      if (!TOKEN_PATTERN.test(value)) {
        record({ kind: "invalid", title: "Not a CampusOS ticket", detail: "This QR code is not a CampusOS ticket." });
        return;
      }
      void run(() => api.post<CheckInResult>("/api/admin/checkin", { qrToken: value, eventId }));
    },
    [busy, eventId, record, run],
  );

  const checkInById = (registrationId: string) => {
    void run(() => api.post<CheckInResult>(`/api/admin/events/${eventId}/registrations/${registrationId}/checkin`, {})).then(() => void attendees.refetch());
  };

  const checkedIn = stats.data?.checkedIn ?? 0;
  const registered = stats.data?.registered ?? 0;
  const style = outcome ? OUTCOME_STYLE[outcome.kind] : null;

  return (
    <AdminPage
      title="Live check-in"
      description={event.data ? `${event.data.title} · ${event.data.venue}` : "Loading event…"}
      actions={
        <Button asChild variant="secondary">
          <Link href={`/admin/events/${eventId}/registrations`}>Attendee list</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Tabs
            label="Check-in method"
            value={mode}
            onValueChange={setMode}
            items={[
              { value: "scan", label: "Scan QR" },
              { value: "code", label: "Enter code" },
              { value: "find", label: "Find attendee" },
            ]}
          />
          {mode === "scan" && <QrScanner onScan={submitToken} paused={busy} />}
          {mode === "code" && (
            <Panel>
              <form
                className="space-y-3"
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  submitToken(code);
                  setCode("");
                }}
              >
                <Field label="Ticket code" hint="The 32-character code printed under the QR on the attendee's ticket.">
                  <Input value={code} onChange={(changeEvent) => setCode(changeEvent.target.value)} autoComplete="off" spellCheck={false} maxLength={40} leading={<Keyboard />} data-autofocus />
                </Field>
                <Button type="submit" loading={busy} disabled={code.trim().length < 8}>
                  Check in
                </Button>
              </form>
            </Panel>
          )}
          {mode === "find" && (
            <Panel>
              <Field label="Search by name, email or student ID" hint="For attendees who forgot their phone.">
                <Input value={query} onChange={(changeEvent) => setQuery(changeEvent.target.value.trim())} leading={<Search />} autoComplete="off" />
              </Field>
              <ul className="mt-4 divide-y divide-border">
                {attendees.data?.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-semibold">{row.user.name}</span>
                      <span className="block truncate text-fg-muted">{[row.user.studentId, row.user.department?.code, row.user.email].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Button size="sm" onClick={() => checkInById(row.id)} disabled={busy}>
                      Check in
                    </Button>
                  </li>
                ))}
                {query.length >= 2 && attendees.data?.length === 0 && <li className="py-6 text-center text-sm text-fg-subtle">No registered attendee matches. They may already be checked in.</li>}
              </ul>
            </Panel>
          )}
          <div aria-live="assertive" className="min-h-24">
            {outcome && style && (
              <div className={cn("flex items-center gap-4 rounded-2xl border-2 p-5", style.className)} role="status">
                <style.icon className="size-10 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-bold">{outcome.title}</p>
                  <p className="text-sm opacity-90">{outcome.detail}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4" aria-label="Live counters">
          <Panel title="Attendance" description="Updates every few seconds.">
            <p className="font-display text-5xl font-bold tabular-nums">
              {checkedIn}
              <span className="text-2xl font-semibold text-fg-subtle"> / {registered}</span>
            </p>
            <Progress className="mt-4" label="Checked in" value={registered ? Math.round((checkedIn / registered) * 100) : 0} tone="accent" />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-fg-muted">Still expected</dt>
                <dd className="font-display text-xl font-bold tabular-nums">{Math.max(0, registered - checkedIn)}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-fg-muted">Capacity</dt>
                <dd className="font-display text-xl font-bold tabular-nums">{stats.data?.capacity ?? "No limit"}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Recent scans">
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-subtle">
                <ScanLine className="mx-auto mb-2 size-6" aria-hidden />
                Scans appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {recent.map((item) => {
                  const itemStyle = OUTCOME_STYLE[item.kind];
                  return (
                    <li key={item.at} className="flex items-center gap-2.5 text-sm">
                      <itemStyle.icon className={cn("size-4 shrink-0", itemStyle.className.split(" ").pop())} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      <time className="shrink-0 text-xs text-fg-subtle" dateTime={item.at}>
                        {formatTime(item.at)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </AdminPage>
  );
}
