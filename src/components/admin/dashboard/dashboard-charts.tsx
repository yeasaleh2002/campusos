"use client";

import { useQuery } from "@tanstack/react-query";
import { AreaChart, BarChart, DonutChart, RankedBars } from "@/components/admin/charts";
import type { AdminStats } from "@/components/admin/dashboard/admin-dashboard";
import { isAdminRole } from "@/components/admin/admin-nav";
import { Panel } from "@/components/admin/kit";
import { api } from "@/lib/api-client";
import { COMPLAINT_STATUS } from "@/lib/labels";

interface ChatbotAnalytics {
  totals: { questions: number; answered: number; unanswered: number; helpful: number; notHelpful: number };
  confidence: Array<{ bucket: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
}

const STATUS_COLOR: Record<string, string> = { RECEIVED: "var(--saffron)", IN_REVIEW: "var(--info)", RESOLVED: "var(--success)", REJECTED: "var(--danger)" };

/** Lazy-loaded chart grid (kept out of the dashboard's first-load bundle). */
export function DashboardCharts({ stats, role }: { stats: AdminStats; role: string }) {
  const admin = isAdminRole(role);
  const canSeeBot = admin || role === "MODERATOR";
  const bot = useQuery({ queryKey: ["admin", "chatbot-analytics"], enabled: canSeeBot, queryFn: () => api.get<ChatbotAnalytics>("/api/admin/chatbot/analytics"), staleTime: 60_000 });
  const { charts } = stats;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {admin && (
        <Panel title="Sign-ups per day" description="New accounts in the last 30 days.">
          <AreaChart label="New sign-ups per day, last 30 days" data={charts.signupsPerDay.map((d) => ({ label: d.day, value: d.count }))} />
        </Panel>
      )}
      {(admin || role === "CLUB_ADMIN") && (
        <Panel title="Registrations per week" description="Event registrations, last 12 weeks.">
          <BarChart label="Event registrations per week, last 12 weeks" tone="var(--primary)" data={charts.registrationsPerWeek.map((d) => ({ label: d.day, value: d.count }))} />
        </Panel>
      )}
      {(admin || role === "MODERATOR") && (
        <Panel title="Complaints by status" description={charts.complaintResolution.medianHours !== null ? `Median resolution ${charts.complaintResolution.medianHours} h across ${charts.complaintResolution.resolved} resolved.` : "No resolved complaints yet."}>
          <DonutChart label="Complaints by status" data={charts.complaintsByStatus.map((row) => ({ label: COMPLAINT_STATUS[row.status as keyof typeof COMPLAINT_STATUS]?.label ?? row.status, value: row.count, color: STATUS_COLOR[row.status] ?? "var(--primary)" }))} />
        </Panel>
      )}
      {(admin || role === "CLUB_ADMIN") && (
        <Panel title="Top events" description="By registrations.">
          <RankedBars label="Top events by registrations" data={charts.topEvents.map((e) => ({ label: e.title, value: e.registrationCount, hint: e.capacity ? `Capacity ${e.capacity}` : "No capacity limit" }))} />
        </Panel>
      )}
      {admin && (
        <Panel title="Top searches" description="What people look for on CampusOS.">
          <RankedBars label="Top search terms" data={charts.topSearchTerms.slice(0, 6).map((t) => ({ label: t.term, value: t.count }))} suffix="×" />
        </Panel>
      )}
      {canSeeBot && (
        <Panel title="Chatbot: answered vs unanswered" description="Last 30 days. Unanswered questions are in Helpdesk → Unanswered.">
          {bot.data ? (
            <DonutChart
              label="Chatbot questions answered versus unanswered"
              data={[
                { label: "Answered", value: bot.data.totals.answered, color: "var(--success)" },
                { label: "Unanswered", value: bot.data.totals.unanswered, color: "var(--danger)" },
              ]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-fg-subtle">{bot.isPending ? "Loading…" : "Analytics unavailable."}</p>
          )}
        </Panel>
      )}
    </div>
  );
}
