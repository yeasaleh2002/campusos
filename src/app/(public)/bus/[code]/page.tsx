import { Flag, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RouteLive } from "@/components/features/bus/route-live";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Timeline } from "@/components/ui/timeline";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";
import { getBusRoute } from "@/server/queries/campus.queries";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const route = await getBusRoute(code);
  if (!route) return buildMetadata({ title: "Route not found", description: "This bus route does not exist.", path: `/bus/${code}`, noIndex: true });
  return buildMetadata({
    title: `Bus ${route.code} ${route.name} route & timetable`,
    description: `Stops, timings and next departures for City University bus ${route.code} (${route.name}). ${route.stops.length} stops from ${route.stops[0]?.name} to campus.`,
    path: `/bus/${route.code}`,
    keywords: ["bus"],
    extraKeywords: [`${route.name} bus City University`, `bus ${route.code}`],
  });
}

export default function RoutePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="container-app my-10 h-96 rounded-3xl" />}>
      <RouteDetail params={params} />
    </Suspense>
  );
}

async function RouteDetail({ params }: Props) {
  const { code } = await params;
  const route = await getBusRoute(code);
  if (!route) notFound();
  const last = route.stops.length - 1;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Bus", path: "/bus" }, { name: route.name, path: `/bus/${route.code}` }])} />
      <div className="container-app py-8 sm:py-10">
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bus", href: "/bus" }, { label: `${route.code} ${route.name}` }]}
          eyebrow={<Badge tone="primary">{route.code}</Badge>}
          title={`${route.name} route`}
          description={route.notes ?? `${route.stops.length} stops - ${route.stops[last]?.offsetMinutes} minutes end to end.`}
        />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <RouteLive
            initial={{
              id: route.id,
              code: route.code,
              name: route.name,
              stops: route.stops,
              notes: route.notes,
              trips: route.trips.map((trip) => ({ ...trip })),
            }}
          />
          <section aria-labelledby="stops-heading" className="rounded-3xl border border-border bg-surface p-5 sm:p-7 lg:sticky lg:top-24 lg:self-start">
            <h2 id="stops-heading" className="mb-5 font-display text-h3 font-bold">
              Stops (to campus)
            </h2>
            <Timeline
              items={route.stops.map((stop, index) => ({
                id: stop.name,
                title: stop.name,
                meta: index === 0 ? "First stop" : `+${stop.offsetMinutes} min`,
                tone: index === last ? "success" : "primary",
                icon: index === last ? <Flag /> : <MapPin />,
              }))}
            />
          </section>
        </div>
      </div>
    </>
  );
}
