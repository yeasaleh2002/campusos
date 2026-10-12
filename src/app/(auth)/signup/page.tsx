import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, AuthCardSkeleton } from "@/components/features/auth/auth-card";
import { SignupForm } from "@/components/features/auth/signup-form";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Create your account",
  description: "Join CampusOS to register for City University events, share notes, follow departments and track your campus requests.",
  path: "/signup",
  keywords: ["auth"],
});

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Free for every City University student."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthCardSkeleton />}>
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}
