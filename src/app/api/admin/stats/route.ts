import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { can, Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { hourBucket } from "@/lib/time";
import { requirePermission } from "@/server/middleware/auth";
import { getAdminStats } from "@/server/queries/platform.queries";

type Stats = Awaited<ReturnType<typeof getAdminStats>>;

/** Moderators and club admins only receive the numbers that belong to their job. */
function scopeStats(stats: Stats, role: string): Stats {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return stats;
  const empty = { signupsPerDay: [], registrationsPerWeek: [], topEvents: [], topSearchTerms: [], complaintsByStatus: [], complaintResolution: stats.charts.complaintResolution };
  const zero = { users: 0, events: 0, registrations: 0, checkIns: 0, resources: 0, pendingResources: 0, lostFound: 0, openLostFound: 0, complaints: 0, openComplaints: 0, chatbotUnanswered: 0, chatbotUnhelpful: 0 };
  if (role === "MODERATOR") {
    const { pendingResources, openLostFound, lostFound, complaints, openComplaints, chatbotUnanswered, chatbotUnhelpful } = stats.totals;
    return { ...stats, totals: { ...zero, pendingResources, openLostFound, lostFound, complaints, openComplaints, chatbotUnanswered, chatbotUnhelpful }, charts: { ...empty, complaintsByStatus: stats.charts.complaintsByStatus } };
  }
  const { events, registrations, checkIns } = stats.totals;
  return { ...stats, totals: { ...zero, events, registrations, checkIns }, charts: { ...empty, registrationsPerWeek: stats.charts.registrationsPerWeek, topEvents: stats.charts.topEvents } };
}

/** Dashboard totals + chart series (cached under the `stats` tag, hourly key), trimmed to the caller's role. */
export const GET = withApiHandler(async (request: NextRequest) => {
  const actor = await requirePermission(request, Permission.AdminAccess);
  const stats = await getAdminStats(hourBucket());
  const scoped = can(actor, Permission.AuditView) ? stats : scopeStats(stats, actor.role);
  return ok(scoped, { headers: { "cache-control": "private, no-store" } });
});
