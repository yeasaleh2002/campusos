import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, AuthCardSkeleton } from "@/components/features/auth/auth-card";
import { VerifyEmailForm } from "@/components/features/auth/verify-email-form";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Verify your email",
  description: "Enter the 6-digit code we emailed you to activate your CampusOS account.",
  path: "/verify-email",
  noIndex: true,
});

export default function VerifyEmailPage() {
  return (
    <AuthCard title="Check your inbox" description="We emailed you a 6-digit code. It expires in 10 minutes." icon={<MailCheck />}>
      <Suspense fallback={<AuthCardSkeleton />}>
        <VerifyEmailForm />
      </Suspense>
    </AuthCard>
  );
}
