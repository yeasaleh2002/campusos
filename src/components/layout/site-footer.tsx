import Link from "next/link";
import type { ReactNode } from "react";
import { PUBLIC_NAV, SECONDARY_NAV } from "@/components/layout/nav-config";
import { DashboardFooterLink } from "@/components/layout/dashboard-footer-link";
import { InstallAppButton } from "@/components/layout/install-app-button";
import { Logo } from "@/components/shared/logo";

const ACCOUNT_LINKS = [
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/signup" },
  { label: "Search", href: "/search" },
  { label: "Staff console", href: "/admin/login" },
];

const ABOUT_LINKS = [{ label: "Contributors", href: "/contributors" }];

/** Site footer (server component, zero client JS). */
export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border bg-surface/60">
      <div className="container-app grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(2,1fr)_1fr_0.8fr]">
        <div className="max-w-sm space-y-4">
          <Logo tagline />
          <p className="text-sm leading-relaxed text-fg-muted">
            One place for all of City University: events, notes, bus times, notices, lost &amp; found and a campus assistant that only answers from verified data.
          </p>
          <p className="text-xs text-fg-subtle">Khagan, Birulia, Savar, Dhaka 1216, Bangladesh</p>
        </div>
        <FooterColumn title="Explore" links={PUBLIC_NAV} />
        <FooterColumn title="Services" links={SECONDARY_NAV} />
        <FooterColumn title="Account" links={ACCOUNT_LINKS} extra={<DashboardFooterLink className="text-sm text-fg-muted transition hover:text-primary" />} />
        <FooterColumn title="About" links={ABOUT_LINKS} />
      </div>
      <div className="container-app flex flex-col items-center gap-2 pb-12 text-center">
        <InstallAppButton />
        <p className="text-xs text-fg-subtle">Works like a native app: add it to your home screen.</p>
      </div>
      <div className="border-t border-border">
        <div className="container-app flex flex-col gap-2 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © CampusOS · City University, Bangladesh. Designed &amp; developed by the{" "}
            <Link href="/contributors" prefetch={false} className="font-semibold text-fg-muted underline-offset-2 transition hover:text-primary hover:underline">
              Nurix Hive
            </Link>{" "}
            team.
          </p>
          <p>
            Press <kbd className="rounded border border-border px-1 font-sans">Ctrl</kbd> + <kbd className="rounded border border-border px-1 font-sans">K</kbd> to search anywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links, extra }: { title: string; links: Array<{ label: string; href: string }>; extra?: ReactNode }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-fg-subtle">{title}</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} prefetch={false} className="text-sm text-fg-muted transition hover:text-primary">
              {link.label}
            </Link>
          </li>
        ))}
        {extra && <li>{extra}</li>}
      </ul>
    </nav>
  );
}
