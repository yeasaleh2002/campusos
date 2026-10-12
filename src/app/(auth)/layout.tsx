import { ArrowLeft, BellRing, Bus, CalendarCheck2, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const HIGHLIGHTS = [
  { icon: CalendarCheck2, text: "Register for club events and get a QR ticket" },
  { icon: FileText, text: "Notes and previous questions by course" },
  { icon: Bus, text: "Live next-bus countdown for your stop" },
  { icon: BellRing, text: "Class cancellation alerts for your department" },
];

/** Split-screen auth shell: brand panel (lg+) + focused form column. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative isolate hidden self-start overflow-hidden bg-brand-gradient p-12 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col xl:p-16" aria-label="About CampusOS">
        <div className="bg-grid absolute inset-0 -z-10 opacity-25" aria-hidden />
        <div className="grain absolute inset-0 -z-10" aria-hidden />
        <div className="absolute -right-32 -top-32 -z-10 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <Logo inverted />
        <div className="my-auto max-w-lg py-12">
          <h2 className="font-display text-h1 font-bold leading-tight tracking-tight">Your whole campus, one sign-in.</h2>
          <p className="mt-4 text-lg text-white/80">Join students across City University who plan their week with CampusOS.</p>
          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Icon className="size-5" />
                </span>
                <span className="text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-sm text-white/70">
          <ShieldCheck className="size-4" /> Passwords are hashed with bcrypt. We never share your data.
        </p>
      </aside>
      <div className="relative flex flex-col">
        <div className="bg-mesh absolute inset-0 -z-10 opacity-60 lg:hidden" aria-hidden />
        <header className="flex items-center justify-between p-4 sm:p-6">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <ArrowLeft className="size-4" aria-hidden /> Back to home
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 outline-none sm:px-6 sm:pt-[min(8vh,5rem)]">
          <div className="w-full max-w-md 3xl:max-w-lg">{children}</div>
        </main>
      </div>
    </div>
  );
}
