import { ArrowLeft, Compass, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

const SUGGESTIONS = [
  { label: "Events", href: "/events" },
  { label: "Bus schedule", href: "/bus" },
  { label: "Resources", href: "/resources" },
  { label: "Helpdesk", href: "/helpdesk" },
];

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-title" className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <div className="bg-mesh absolute inset-0 -z-10" aria-hidden />
      <div className="grain absolute inset-0 -z-10" aria-hidden />
      <div className="w-full max-w-xl text-center">
        <Logo className="mb-10 justify-center" />
        <p className="font-display text-[clamp(6rem,20vw,10rem)] font-extrabold leading-none tracking-tighter text-gradient">404</p>
        <h1 id="not-found-title" className="mt-4 font-display text-h2 font-bold">This page took a different bus</h1>
        <p className="mt-3 text-fg-muted">The link may be old, or the item was removed. Try one of these instead:</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:text-primary">
                <Compass className="size-4" /> {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <ArrowLeft /> Back home
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/search">
              <Search /> Search CampusOS
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
