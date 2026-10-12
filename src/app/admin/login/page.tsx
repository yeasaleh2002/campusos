import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCardSkeleton } from "@/components/features/auth/auth-card";
import { LoginForm } from "@/components/features/auth/login-form";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Staff sign in",
  description: "Restricted sign-in for CampusOS administrators and moderators.",
  path: "/admin/login",
  noIndex: true,
});

export default function AdminLoginPage() {
  return (
    <div className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[#070816] px-4 py-10 text-white">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.22),transparent),radial-gradient(50%_40%_at_100%_100%,rgba(99,102,241,0.28),transparent)]" />
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-[0.12]" />
      <Link href="/" className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/15 hover:text-white">
        <ArrowLeft className="size-4" aria-hidden /> Back to home page
      </Link>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <main id="main" tabIndex={-1} className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo inverted href={null} />
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8 [&_label]:text-white [&_input]:bg-white/10 [&_input]:text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="size-3.5" /> Staff access only
          </span>
          <h1 className="mt-4 font-display text-h2 font-bold">Admin console</h1>
          <p className="mt-2 text-sm text-white/70">Sign in with your staff account. All actions are audit-logged.</p>
          <div className="mt-6">
            <Suspense fallback={<AuthCardSkeleton />}>
              <LoginForm variant="staff" />
            </Suspense>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-white/60">
          Not staff?{" "}
          <Link href="/login" className="font-semibold text-emerald-300 hover:underline">
            Student sign in
          </Link>
          {" · "}
          <Link href="/" className="font-semibold text-emerald-300 hover:underline">
            Home page
          </Link>
        </p>
      </main>
    </div>
  );
}
