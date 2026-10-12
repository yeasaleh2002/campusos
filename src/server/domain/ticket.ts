/**
 * Complaint ticket numbers: CU-<year>-<6+ digit sequence>, e.g. CU-2026-000123.
 * The sequence is allocated atomically per year in the database (TicketCounter).
 */
export const TICKET_PATTERN = /^CU-(\d{4})-(\d{6,})$/;

export function formatTicketNo(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError("Ticket sequence must be a positive integer.");
  return `CU-${year}-${String(sequence).padStart(6, "0")}`;
}

export function parseTicketNo(ticketNo: string): { year: number; sequence: number } | null {
  const match = TICKET_PATTERN.exec(ticketNo.trim().toUpperCase());
  return match ? { year: Number(match[1]), sequence: Number(match[2]) } : null;
}

/** Calendar year in Asia/Dhaka (tickets filed at 00:30 on 1 Jan Dhaka belong to the new year). */
export function dhakaYear(now: Date): number {
  return new Date(now.getTime() + 6 * 60 * 60 * 1000).getUTCFullYear();
}
