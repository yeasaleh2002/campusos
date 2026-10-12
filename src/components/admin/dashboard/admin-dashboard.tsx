"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, Bot, Calendar, CalendarCheck2, Megaphone, PackageSearch, Plus, QrCode, ScanLine, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { isAdminRole } from "@/components/admin/admin-nav";
import { AdminPage, Panel } from "@/components/admin/kit";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";

const Charts = dynamic(() => import("@/components/admin/dashboard/dashboard-charts").then((mod) => mod.DashboardCharts), {
  ssr: false,
  loading: () => <Skeleton className="h-80 rounded-2xl" />,
});

export interface AdminStats {
  totals: {
    users: number;
    events: number;
    registrations: number;
    checkIns: number;
    resources: number;
    pendingResources: number;
    lostFound: number;
    openLostFound: number;
    complaints: number;
    openComplaints: number;
    chatbotUnanswered: number;
    chatbotUnhelpful: number;
  };
  charts: {
    complaintsByStatus: Array<{ status: string; count: number }>;
    signupsPerDay: Array<{ day: string; count: number }>;
    registrationsPerWeek: Array<{ day: string; count: number }>;
    complaintResolution: { resolved: number; avgHours: number | null; medianHours: number | null };
    topEvents: Array<{ id: string; title: string; registrationCount: number; capacity: number | null }>;
    topSearchTerms: Array<{ term: string; count: number }>;
  };
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor: { name: string; role: string } | null;
}

const ACTION_WORDS: Record<string, string> = { create: "created", update: "updated", delete: "deleted", publish: "published", cancel: "cancelled", approve: "approved", reject: "rejected", checkin: "checked in", force_logout: "forced logout of", member_set: "changed members of" };

function describeAction(action: string): string {
  const [entity, verb = ""] = action.split(".");
  return `${ACTION_WORDS[verb] ?? verb.replaceAll("_", " ")} ${entity.replaceAll("_", " ")}`;
}

function RecentActivity() {
  const { data, isPending } = useQuery({ queryKey: ["admin", "recent-activity"], queryFn: () => api.get<AuditEntry[]>("/api/admin/audit-logs", { query: { limit: 8 } }), staleTime: 30_000 });
  return (
    <Panel title="Recent activity" description="Latest admin actions from the audit log.">
      {isPending ? (
        <Skeleton className="h-52 rounded-xl" />
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-fg-subtle">No activity recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-semibold">{entry.actor?.name ?? "System"}</span> <span className="text-fg-muted">{describeAction(entry.action)}</span>
              </span>
              <time className="shrink-0 text-xs text-fg-subtle" dateTime={entry.createdAt}>
                {formatRelative(entry.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="ghost" size="sm" className="mt-3">
        <Link href="/admin/audit-log">Open audit log</Link>
      </Button>
    </Panel>
  );
}

function QuickActions({ role }: { role: string }) {
  const admin = isAdminRole(role);
  const actions = [
    { href: "/admin/events/new", label: "New event", icon: Plus, show: admin || role === "CLUB_ADMIN" },
    { href: "/admin/notices?template=class-cancel", label: "Cancel a class", icon: Megaphone, show: admin },
    { href: "/admin/resources", label: "Review resources", icon: BookOpen, show: admin || role === "MODERATOR" },
    { href: "/admin/complaints", label: "Open complaints", icon: AlertTriangle, show: admin || role === "MODERATOR" },
    { href: "/admin/helpdesk?tab=gaps", label: "Chatbot gaps", icon: Bot, show: admin || role === "MODERATOR" },
    { href: "/admin/events", label: "Check-in", icon: ScanLine, show: admin || role === "CLUB_ADMIN" },
  ].filter((action) => action.show);
  return (
    <Panel title="Quick actions">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => (
          <li key={action.label}>
            <Link href={action.href} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-3.5 py-3 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary-soft-fg">
              <action.icon className="size-4" aria-hidden /> {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api.get<AdminStats>("/api/admin/stats"), refetchInterval: 60_000 });

  if (stats.isError) return <AdminPage title="Dashboard"><ErrorState error={stats.error} onRetry={() => void stats.refetch()} /></AdminPage>;
  const totals = stats.data?.totals;
  const admin = isAdminRole(role);
  const cards = [
    { label: "Students & staff", value: totals?.users, icon: <Users />, show: admin, tone: "primary" as const },
    { label: "Events", value: totals?.events, icon: <Calendar />, show: admin || role === "CLUB_ADMIN", tone: "accent" as const },
    { label: "Registrations", value: totals?.registrations, icon: <CalendarCheck2 />, show: admin || role === "CLUB_ADMIN", tone: "info" as const, hint: totals ? `${totals.checkIns} checked in` : undefined },
    { label: "Pending resources", value: totals?.pendingResources, icon: <BookOpen />, show: admin || role === "MODERATOR", tone: "saffron" as const },
    { label: "Open lost & found", value: totals?.openLostFound, icon: <PackageSearch />, show: admin || role === "MODERATOR", tone: "info" as const },
    { label: "Open complaints", value: totals?.openComplaints, icon: <AlertTriangle />, show: admin || role === "MODERATOR", tone: "saffron" as const },
    { label: "Chatbot unanswered", value: totals?.chatbotUnanswered, icon: <Bot />, show: admin || role === "MODERATOR", tone: "accent" as const, hint: totals ? `${totals.chatbotUnhelpful} marked unhelpful` : undefined },
    { label: "Check-ins", value: totals?.checkIns, icon: <QrCode />, show: role === "CLUB_ADMIN", tone: "accent" as const },
  ].filter((card) => card.show);

  return (
    <AdminPage title="Dashboard" description={`Welcome back${user ? `, ${user.name.split(" ")[0]}` : ""}. Here is what needs attention.`}>
      <section aria-label="Key numbers" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.isPending
          ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)
          : cards.map((card) => <StatCard key={card.label} label={card.label} value={card.value ?? 0} icon={card.icon} tone={card.tone} hint={card.hint} />)}
      </section>
      {stats.data && <Charts stats={stats.data} role={role} />}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        {admin ? <RecentActivity /> : <div />}
        <QuickActions role={role} />
      </div>
    </AdminPage>
  );
}
