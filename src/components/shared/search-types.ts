/** Client-side shape of GET /api/search (mirrors GlobalSearchResult). */
export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  link: string;
}

export type SearchGroupKey = "events" | "resources" | "notices" | "helpdesk" | "lostFound";

export interface SearchResponse {
  q: string;
  results: Record<SearchGroupKey, SearchHit[]>;
}

export const SEARCH_GROUPS: Array<{ key: SearchGroupKey; label: string }> = [
  { key: "events", label: "Events" },
  { key: "resources", label: "Resources" },
  { key: "notices", label: "Notices" },
  { key: "helpdesk", label: "Helpdesk" },
  { key: "lostFound", label: "Lost & Found" },
];

/** Event subtitles are "ISO · venue"; render the date in Dhaka time. Enum subtitles get humanised. */
export function formatHitSubtitle(group: SearchGroupKey, subtitle: string): string {
  if (group !== "events") return humanize(subtitle);
  const [iso, venue] = subtitle.split(" · ");
  const date = new Date(iso ?? "");
  if (Number.isNaN(date.getTime())) return subtitle;
  const when = date.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return venue ? `${when} · ${venue}` : when;
}

/** "CLASS_CANCELLATION" → "Class cancellation" (leaves mixed-case text alone). */
export function humanize(value: string): string {
  return value.replace(/\b[A-Z][A-Z_]+\b/g, (word) => {
    const lower = word.replaceAll("_", " ").toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}
