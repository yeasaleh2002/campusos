import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/features/auth/auth-card";
import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Forgot password",
  description: "Reset your CampusOS password with a one-time code sent to your email.",
  path: "/forgot-password",
  keywords: ["auth"],
});

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send a code to reset it."
      icon={<KeyRound />}
      footer={
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
