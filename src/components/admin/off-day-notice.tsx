"use client";

import { TriangleAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/choice";
import { describeClosedReason, statusOfDate, weekdayName } from "@/config/campus-calendar";
import { useCampusClosures } from "@/hooks/use-campus-closures";

interface OffDayNoticeProps {
  /** `YYYY-MM-DD` on the Dhaka calendar (the date part of a datetime-local value). */
  dateKey: string;
  /** Wording for what is being scheduled: "event", "notice" ... */
  subject: string;
  /** Present when the organiser must tick a box to continue (events). Omitted for soft warnings. */
  confirm?: { checked: boolean; onChange: (checked: boolean) => void; error?: string };
}

/**
 * Non-blocking "Campus is closed on this day" warning for admins, shown for weekly off days and
 * closures. Renders nothing on a working day.
 */
export function OffDayNotice({ dateKey, subject, confirm }: OffDayNoticeProps) {
  const closures = useCampusClosures();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const status = statusOfDate(dateKey, closures);
  if (status.open) return null;

  return (
    <div role="alert" className="space-y-3 rounded-xl border border-warning/40 bg-warning-soft/60 p-4 text-sm">
      <p className="flex items-start gap-2 font-semibold text-fg">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <span>
          Campus is closed on this day ({weekdayName(status.weekday)}: {describeClosedReason(status)}). Students cannot attend classes or take the bus, so check that this {subject} is meant for an off day.
        </span>
      </p>
      {confirm && (
        <div>
          <Checkbox label="I confirm this event is deliberately scheduled on a campus off day" checked={confirm.checked} onChange={(event) => confirm.onChange(event.target.checked)} />
          {confirm.error && <p className="mt-1 text-xs font-medium text-danger">{confirm.error}</p>}
        </div>
      )}
    </div>
  );
}
