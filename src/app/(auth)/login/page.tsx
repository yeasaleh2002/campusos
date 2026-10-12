import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, AuthCardSkeleton } from "@/components/features/auth/auth-card";
import { LoginForm } from "@/components/features/auth/login-form";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sign in",
  description: "Sign in to CampusOS to register for events, save notes, follow departments and track your requests at City University.",
  path: "/login",
  keywords: ["auth"],
});

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your CampusOS account."
      footer={
        <>
          New to CampusOS?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
