import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, AuthCardSkeleton } from "@/components/features/auth/auth-card";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Reset password",
  description: "Choose a new CampusOS password using the code from your email.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Set a new password" description="Enter the code we emailed you and choose a strong password." icon={<ShieldCheck />}>
      <Suspense fallback={<AuthCardSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
