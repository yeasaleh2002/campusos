/** "Add to calendar" helpers: .ics file content and a Google Calendar template link. */

interface CalendarEntry {
  title: string;
  description?: string;
  location?: string;
  start: Date | string;
  end: Date | string;
  url?: string;
  uid: string;
}

const stamp = (value: Date | string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeIcs = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 calendar file (UTC times). */
export function buildIcs(entry: CalendarEntry): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusOS//City University//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${entry.uid}@campusos`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(entry.start)}`,
    `DTEND:${stamp(entry.end)}`,
    `SUMMARY:${escapeIcs(entry.title)}`,
    ...(entry.description ? [`DESCRIPTION:${escapeIcs(entry.description)}`] : []),
    ...(entry.location ? [`LOCATION:${escapeIcs(entry.location)}`] : []),
    ...(entry.url ? [`URL:${entry.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function googleCalendarUrl(entry: CalendarEntry): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${stamp(entry.start)}/${stamp(entry.end)}`,
    details: [entry.description, entry.url].filter(Boolean).join("\n\n"),
    location: entry.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Triggers a client-side download of a file built in the browser. */
export function downloadFile(filename: string, content: BlobPart, type = "text/calendar;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
