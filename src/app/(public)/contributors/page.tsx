import { Briefcase, ExternalLink, GraduationCap, Languages, MapPin, Mail, MessageCircle, Smile, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/config/seo";
import { type Contributor, CONTRIBUTORS } from "@/config/contributors";

export const metadata: Metadata = buildMetadata({
  title: "Contributors",
  description: "Meet the Nurix Hive team behind CampusOS, the unified campus hub for City University, Bangladesh.",
  path: "/contributors",
});

export default function ContributorsPage() {
  return (
    <>
      <PageHeader
        variant="hero"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contributors" }]}
        eyebrow="The team"
        title={
          <>
            The people behind <span className="text-gradient">CampusOS</span>
          </>
        }
        description="CampusOS is designed and built by Nurix Hive, students and engineers who wanted campus life at City University to run on one fast, honest app."
      />
      <section aria-label="Contributors" className="container-app py-12 sm:py-16">
        <ul className="grid gap-8 lg:grid-cols-2">
          {CONTRIBUTORS.map((person, index) => (
            <li key={person.id} className="animate-fade-up" style={{ animationDelay: `${index * 120}ms` }}>
              <ContributorCard person={person} priority={index === 0} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ContributorCard({ person, priority }: { person: Contributor; priority: boolean }) {
  const headingId = `contributor-${person.id}`;
  return (
    <article aria-labelledby={headingId} className="group relative h-full overflow-hidden rounded-[2rem] border border-border bg-surface p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-brand-gradient opacity-10 blur-3xl transition duration-500 group-hover:opacity-25" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          <span aria-hidden className="absolute -inset-1.5 rounded-[1.75rem] bg-brand-gradient opacity-80 blur-[2px]" />
          <Image
            src={person.photo}
            alt={person.photoAlt}
            width={240}
            height={240}
            sizes="(min-width: 640px) 176px, 160px"
            priority={priority}
            className="relative size-40 rounded-3xl border-2 border-surface object-cover sm:size-44"
          />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <h2 id={headingId} className="font-display text-2xl font-bold tracking-tight">
            {person.name}
          </h2>
          <p className="mt-1 text-sm font-semibold text-primary">{person.headline}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-fg-subtle">
            <MapPin className="size-4" aria-hidden /> {person.location}
          </p>
          <p className="mt-2">
            <Badge tone="accent">{person.batch}</Badge>
          </p>
        </div>
      </div>

      <p className="relative mt-6 leading-relaxed text-fg-muted">{person.summary}</p>

      <ul aria-label={`${person.name}'s skills`} className="relative mt-5 flex flex-wrap gap-2">
        {person.skills.map((skill) => (
          <li key={skill}>
            <Badge tone="primary">{skill}</Badge>
          </li>
        ))}
      </ul>

      {person.roles.length > 0 && (
        <div className="relative mt-6">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <Briefcase className="size-4" aria-hidden /> Experience
          </h3>
          <ul className="mt-3 space-y-2.5">
            {person.roles.map((role) => (
              <li key={`${role.org}-${role.period}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-xl bg-surface-2/70 px-3.5 py-2.5 text-sm">
                <span className="font-semibold">
                  {role.title} <span className="font-normal text-fg-muted">· {role.org}</span>
                </span>
                <span className="text-xs text-fg-subtle">{role.period}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative mt-6">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          <Sparkles className="size-4" aria-hidden /> Highlights
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-fg-muted">
          {person.highlights.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <dl className="relative mt-6 space-y-2 text-sm">
        {person.education && (
          <div className="flex gap-2.5">
            <dt className="sr-only">Education</dt>
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
            <dd className="text-fg-muted">{person.education}</dd>
          </div>
        )}
        {person.languages && (
          <div className="flex gap-2.5">
            <dt className="sr-only">Languages</dt>
            <Languages className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
            <dd className="text-fg-muted">{person.languages.join(" · ")}</dd>
          </div>
        )}
        {person.funFact && (
          <div className="flex gap-2.5">
            <dt className="sr-only">Fun fact</dt>
            <Smile className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
            <dd className="text-fg-muted">Fun fact: {person.funFact}</dd>
          </div>
        )}
      </dl>

      <div className="relative mt-7 flex flex-wrap gap-3">
        <Button asChild size="sm">
          <a href={`mailto:${person.email}`}>
            <Mail /> {person.email}
          </a>
        </Button>
        <Button asChild size="sm" variant="accent">
          <a href={`https://wa.me/${person.whatsapp.digits}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${person.name} for urgent contact, ${person.whatsapp.display}`}>
            <MessageCircle /> WhatsApp (urgent) {person.whatsapp.display}
          </a>
        </Button>
        {person.links.map((link) => (
          <Button key={link.href} asChild size="sm" variant="secondary">
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> {link.label}
            </a>
          </Button>
        ))}
      </div>
    </article>
  );
}
