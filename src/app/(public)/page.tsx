import { describeOffDays } from "@/config/campus-calendar";
import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  Bot,
  Bus,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  FileText,
  HelpCircle,
  MessageSquareWarning,
  PackageSearch,
  ScanLine,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AskAssistantButton } from "@/components/features/home/ask-assistant-button";
import { CampusWeekStrip } from "@/components/features/home/campus-week-strip";
import { ContributorsBand } from "@/components/features/home/contributors-band";
import { HeroSearch } from "@/components/features/home/hero-search";
import { CardRowSkeleton, LiveStats, LiveStatsSkeleton, NextBusWidget, NoticesTicker, PanelSkeleton, WeekEvents } from "@/components/features/home/live-sections";
import { JsonLd } from "@/components/shared/json-ld";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata, faqJsonLd, siteConfig } from "@/config/seo";
import { getHelpdeskEntries } from "@/server/queries/helpdesk.queries";

export const metadata: Metadata = {
  ...buildMetadata({ title: siteConfig.tagline, description: siteConfig.description, path: "/", keywords: ["home", "events", "bus", "resources", "notices"] }),
  title: { absolute: `${siteConfig.name} - ${siteConfig.tagline}` },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <section aria-label="CampusOS in numbers" className="container-app relative -mt-10 sm:-mt-14">
        <Suspense fallback={<LiveStatsSkeleton />}>
          <LiveStats />
        </Suspense>
      </section>

      <section aria-label="Latest notices" className="mt-12">
        <Suspense fallback={<div className="container-app"><Skeleton className="h-11 rounded-full" /></div>}>
          <NoticesTicker />
        </Suspense>
      </section>

      <section aria-labelledby="week-title" className="container-app reveal mt-20">
        <SectionHeading id="week-title" eyebrow="Happening now" title="This week on campus" description="Workshops, contests and fests from every club - register in one tap and get a QR ticket." href="/events" cta="All events" />
        <Suspense fallback={<CardRowSkeleton />}>
          <WeekEvents />
        </Suspense>
      </section>

      <ModuleGrid />

      <section aria-label="The campus week" className="container-app reveal mt-20">
        <CampusWeekStrip />
      </section>

      <section aria-labelledby="bus-title" className="container-app reveal mt-24 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Never miss the bus</p>
          <h2 id="bus-title" className="mt-2 font-display text-h2 font-bold tracking-tight">Live next-bus finder, in Dhaka time</h2>
          <p className="mt-4 max-w-xl text-lead text-fg-muted">
            Pick your route and stop and see a live countdown. It knows the weekly off days (no bus on {describeOffDays()}), holiday closures and both directions, and you can also ask the assistant in Banglish: <em>&ldquo;mirpur er porer bus kokhon?&rdquo;</em>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/bus">
                <Bus /> Open bus finder
              </Link>
            </Button>
            <AskAssistantButton variant="secondary" size="lg" question="When is the next bus?" />
          </div>
        </div>
        <Suspense fallback={<PanelSkeleton />}>
          <NextBusWidget />
        </Suspense>
      </section>

      <Scenarios />

      <section aria-labelledby="faq-title" className="container-app reveal mt-24 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Helpdesk</p>
          <h2 id="faq-title" className="mt-2 font-display text-h2 font-bold tracking-tight">Answers, before you ask</h2>
          <p className="mt-4 text-lead text-fg-muted">Verified answers about exams, admission, transport and rules. Still stuck? The assistant replies in English, Banglish or বাংলা.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/helpdesk">
                <HelpCircle /> Browse the helpdesk
              </Link>
            </Button>
            <AskAssistantButton variant="ghost" />
          </div>
        </div>
        <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
          <FaqPreview />
        </Suspense>
      </section>

      <ContributorsBand />

      <CtaBand />
    </>
  );
}

const HERO_CHIPS = [
  { icon: ScanLine, label: "QR event tickets" },
  { icon: Bus, label: "Live bus countdown" },
  { icon: Bot, label: "Banglish assistant" },
  { icon: ShieldCheck, label: "Anonymous complaints" },
];

function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-24 pt-12 sm:pb-32 sm:pt-20 lg:pt-24">
      <div className="bg-mesh absolute inset-0 -z-20" aria-hidden />
      <div className="bg-grid absolute inset-0 -z-10 opacity-60" aria-hidden />
      <div className="grain absolute inset-0 -z-10" aria-hidden />
      {/* Drifting colour glows: transform-only animation, decorative. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <span className="absolute -left-28 -top-10 size-[22rem] animate-aurora rounded-full bg-primary/25 blur-3xl sm:size-[28rem]" />
        <span className="absolute -right-24 top-12 size-[20rem] animate-aurora-slow rounded-full bg-accent/20 blur-3xl sm:size-[26rem]" />
        <span className="absolute -bottom-32 left-1/3 hidden size-[24rem] animate-aurora rounded-full bg-saffron/15 blur-3xl sm:block" />
      </div>
      <div className="container-app grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 max-w-3xl">
          <p className="inline-flex animate-fade-up rounded-full bg-brand-gradient p-px shadow-sm">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-fg-muted sm:text-sm">
              <Sparkles className="size-4 text-saffron" aria-hidden /> Built for City University students
              <span className="relative ml-1 flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
            </span>
          </p>
          <h1 className="mt-6 font-display text-display font-extrabold tracking-tight">
            One place for <span className="text-gradient">all of City University</span>
          </h1>
          <p className="mt-6 max-w-2xl animate-fade-up text-lead text-fg-muted [animation-delay:60ms]">
            Events and clubs, notes and previous questions, live bus times, notices and class cancellations, lost &amp; found and a campus assistant, together in one fast app.
          </p>
          <div className="mt-8 animate-fade-up [animation-delay:120ms]">
            <HeroSearch />
          </div>
          <div className="mt-6 flex animate-fade-up flex-wrap gap-3 [animation-delay:180ms]">
            <Button asChild size="lg" variant="gradient" className="sheen">
              <Link href="/signup">
                Get started free <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/events">
                <CalendarDays /> Explore events
              </Link>
            </Button>
          </div>
          <ul className="mt-8 flex animate-fade-up flex-wrap gap-2 [animation-delay:240ms]" aria-label="Highlights">
            {HERO_CHIPS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs font-semibold text-fg-muted sm:text-sm">
                <Icon className="size-3.5 text-primary sm:size-4" aria-hidden /> {label}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/** Decorative product preview (pure CSS, no images → instant LCP). */
function HeroVisual() {
  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block 3xl:max-w-lg" aria-hidden>
      <div className="absolute inset-8 rounded-[2.5rem] bg-brand-gradient opacity-25 blur-3xl" />
      <div className="absolute inset-4 animate-orbit rounded-full border border-dashed border-primary/30">
        <span className="absolute -top-1.5 left-1/2 size-3 rounded-full bg-primary shadow-glow" />
        <span className="absolute bottom-10 right-2 size-2.5 rounded-full bg-accent" />
        <span className="absolute left-3 top-1/3 size-2 rounded-full bg-saffron" />
      </div>
      <div className="glass absolute left-0 top-14 w-60 animate-float rounded-3xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg">
            <CalendarCheck2 className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Registered!</p>
            <p className="text-xs text-fg-subtle">Intra-University Hackathon</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl bg-surface p-3">
          <div className="grid size-16 grid-cols-4 gap-0.5 rounded-lg bg-white p-1.5">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className={(i * 7) % 3 === 0 ? "bg-slate-900" : "bg-transparent"} />
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><ScanLine className="size-3.5 text-accent" /> QR ticket ready</p>
            <div className="h-2 w-28 rounded-full bg-surface-3" />
            <div className="h-2 w-20 rounded-full bg-surface-3" />
          </div>
        </div>
      </div>
      <div className="glass absolute bottom-16 right-0 w-64 animate-float rounded-3xl p-5 shadow-lg [animation-delay:-3s]">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Bus className="size-4 text-accent" /> R2 · Mirpur 10
        </p>
        <p className="mt-2 font-display text-3xl font-bold">
          in 12 <span className="text-base font-semibold text-fg-muted">min</span>
        </p>
        <p className="mt-1 text-xs text-fg-subtle">7:15 AM → Campus</p>
      </div>
      <div className="glass absolute -top-2 right-0 w-48 animate-float rounded-2xl p-3.5 shadow-md [animation-delay:-1.5s]">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <Bot className="size-4 text-primary" /> Ask CampusOS
        </p>
        <p className="mt-2 rounded-xl rounded-bl-sm bg-surface px-3 py-2 text-xs">Is the university open tomorrow?</p>
        <p className="mt-1.5 flex items-center gap-1 px-1">
          <span className="size-1.5 animate-blink rounded-full bg-primary" />
          <span className="size-1.5 animate-blink rounded-full bg-primary [animation-delay:0.2s]" />
          <span className="size-1.5 animate-blink rounded-full bg-primary [animation-delay:0.4s]" />
        </p>
      </div>
      <div className="glass absolute bottom-0 left-10 flex animate-float items-center gap-3 rounded-2xl px-4 py-3 shadow-md [animation-delay:-5s]">
        <BellRing className="size-5 text-danger" />
        <p className="text-sm font-semibold">CSE-2201 class cancelled today</p>
      </div>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title, description, href, cta }: { id: string; eyebrow: string; title: string; description: string; href?: string; cta?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        <h2 id={id} className="mt-2 font-display text-h2 font-bold tracking-tight">{title}</h2>
        <p className="mt-3 text-fg-muted">{description}</p>
      </div>
      {href && cta && (
        <Button asChild variant="ghost" className="self-start sm:self-auto">
          <Link href={href}>
            {cta} <ArrowRight />
          </Link>
        </Button>
      )}
    </div>
  );
}

const MODULES: Array<{ title: string; description: string; href: string; icon: LucideIcon; points: string[]; gradient: string; iconClass: string }> = [
  {
    title: "Events & Clubs",
    description: "Every club, one calendar.",
    href: "/events",
    icon: CalendarDays,
    points: ["One-tap registration", "QR tickets & check-in", "Add to Google Calendar"],
    gradient: "from-indigo-500/20 to-violet-500/5", iconClass: "text-primary",
  },
  {
    title: "Resource Hub",
    description: "Notes & previous questions by course.",
    href: "/resources",
    icon: BookOpenCheck,
    points: ["Department → course → type", "Moderated PDF uploads", "Bookmarks & search"],
    gradient: "from-amber-500/20 to-orange-500/5", iconClass: "text-saffron",
  },
  {
    title: "Helpdesk & Bus",
    description: "Grounded answers and live departures.",
    href: "/helpdesk",
    icon: HelpCircle,
    points: ["Assistant in English, Banglish and বাংলা", "Next-bus countdown", "Verified FAQ"],
    gradient: "from-emerald-500/20 to-teal-500/5", iconClass: "text-accent",
  },
  {
    title: "Lost & Found + Voice",
    description: "Get things back. Get heard.",
    href: "/lost-found",
    icon: PackageSearch,
    points: ["Photo posts with smart matches", "Safe claim flow", "Anonymous complaints with tracking"],
    gradient: "from-rose-500/20 to-pink-500/5", iconClass: "text-danger",
  },
];

function ModuleGrid() {
  return (
    <section aria-labelledby="modules-title" className="container-app reveal mt-24">
      <SectionHeading id="modules-title" eyebrow="Everything in one place" title="Four modules. One campus." description="CampusOS replaces scattered Facebook groups, notice boards and photocopied timetables with one place you can trust." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MODULES.map((module) => {
          const Icon = module.icon;
          return (
            <li key={module.title}>
              <Link href={module.href} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lg">
                <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${module.gradient} transition-all duration-500 group-hover:h-40`} aria-hidden />
                <span className={`relative grid size-12 place-items-center rounded-2xl bg-surface shadow-sm transition duration-300 group-hover:-rotate-6 group-hover:scale-110 ${module.iconClass}`}>
                  <Icon className="size-6" />
                </span>
                <h3 className="relative mt-5 font-display text-xl font-semibold">{module.title}</h3>
                <p className="relative mt-1 text-sm text-fg-muted">{module.description}</p>
                <ul className="relative mt-5 space-y-2 text-sm">
                  {module.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Open <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const SCENARIOS: Array<{ problem: string; story: string; solution: string; href: string; icon: LucideIcon }> = [
  { problem: "Missed the workshop again?", story: "The poster was in a group you muted.", solution: "Follow clubs and get a feed, reminders and a QR ticket for every event.", href: "/events", icon: CalendarDays },
  { problem: "Bus left without you?", story: "The timetable photo was from last semester.", solution: "Live next-bus countdown for your stop, always from the current schedule.", href: "/bus", icon: Bus },
  { problem: "Came to campus for a cancelled class?", story: "The notice went up after you left home.", solution: "Cancellations are highlighted first, with alerts for departments you follow.", href: "/notices", icon: BellRing },
  { problem: "Can't find last year's questions?", story: "They're scattered across five Drive links.", solution: "A moderated hub by department, course and semester, searchable in seconds.", href: "/resources", icon: FileText },
  { problem: "Lost your ID card?", story: "Posting in every group didn't help.", solution: "Post once with photos; smart matching suggests found items automatically.", href: "/lost-found", icon: PackageSearch },
  { problem: "Problem nobody hears about?", story: "No one knew who to tell.", solution: "File a complaint (anonymously if you like) and track it with a ticket number.", href: "/complaints/new", icon: MessageSquareWarning },
];

function Scenarios() {
  return (
    <section aria-labelledby="scenarios-title" className="relative mt-24 overflow-hidden py-20">
      <div className="absolute inset-0 -z-10 bg-surface/70" aria-hidden />
      <div className="bg-grid absolute inset-0 -z-10 opacity-40" aria-hidden />
      <div className="container-app">
        <SectionHeading id="scenarios-title" eyebrow="Real problems, solved" title="How CampusOS solves your day" description="Everyday moments at City University, and what changes when everything lives in one place." />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <li key={scenario.problem} className="reveal">
                <Link href={scenario.href} className="group flex h-full flex-col rounded-3xl border border-border bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg transition duration-300 group-hover:bg-primary group-hover:text-primary-fg">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{scenario.problem}</h3>
                  <p className="mt-1 text-sm italic text-fg-subtle">{scenario.story}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-fg-muted">
                    <span className="font-semibold text-accent">With CampusOS: </span>
                    {scenario.solution}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    See how <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Cached (tag `kb`) - prerendered into the static shell. */
async function FaqPreview() {
  const { items } = await getHelpdeskEntries({ limit: 6 });
  if (items.length === 0) return null;
  const faqs = items.map((entry) => ({ id: entry.id, title: entry.question, content: <p className="whitespace-pre-line">{entry.answer}</p> }));
  return (
    <div>
      <Accordion items={faqs} defaultOpen={faqs[0]?.id ?? null} />
      <JsonLd data={faqJsonLd(items.map((entry) => ({ question: entry.question, answer: entry.answer })))} />
    </div>
  );
}

function CtaBand() {
  return (
    <section className="container-app reveal mt-24">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-brand-gradient px-6 py-14 text-center text-white shadow-glow sm:px-12 sm:py-20">
        <div className="bg-grid absolute inset-0 -z-10 opacity-20" aria-hidden />
        <div className="grain absolute inset-0 -z-10" aria-hidden />
        <span className="absolute -left-16 -top-16 -z-10 size-64 animate-aurora rounded-full bg-white/15 blur-3xl" aria-hidden />
        <span className="absolute -bottom-20 -right-10 -z-10 size-72 animate-aurora-slow rounded-full bg-white/10 blur-3xl" aria-hidden />
        <h2 className="mx-auto max-w-3xl font-display text-h2 font-bold tracking-tight">Your whole campus, in your pocket</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">Create a free account with your email to register for events, save notes, follow departments and get alerts that matter to you.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="sheen bg-white text-indigo-700 hover:bg-white/90">
            <Link href="/signup">
              Create free account <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
            <Link href="/helpdesk">Browse helpdesk</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
