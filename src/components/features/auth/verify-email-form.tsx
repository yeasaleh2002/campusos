"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { safeNext } from "@/components/features/auth/auth-form-kit";
import { ResendCode, useResendCode } from "@/components/features/auth/resend-code";
import { type CurrentUser, useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";

/** 6-digit email verification; signs the user in on success. */
export function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const email = params.get("email") ?? "";
  const next = safeNext(params.get("next"));
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resend = useResendCode(email, "SIGNUP_VERIFY");

  if (!email) {
    return (
      <p className="rounded-xl bg-surface-2 p-4 text-sm text-fg-muted">
        We need your email to verify it. <Link href="/signup" className="font-semibold text-primary hover:underline">Start from sign up</Link> or{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">sign in</Link>.
      </p>
    );
  }

  const submit = async (value: string) => {
    if (busy || value.length !== 6) return;
    setBusy(true);
    setError(null);
    const toastId = toast.loading("Verifying…");
    try {
      const data = await api.post<{ user: CurrentUser }>("/api/auth/verify-email", { email, code: value }, { notifyUnauthorized: false });
      setUser(data.user);
      toast.success("Email verified - welcome to CampusOS!", { id: toastId });
      router.replace(next);
      router.refresh();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      if (err instanceof ApiClientError && (err.code === "INVALID_OTP" || err.code === "OTP_ATTEMPTS_EXCEEDED")) setCode("");
      toast.error(message, { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(code);
      }}
      className="space-y-6"
    >
      <OtpInput value={code} onChange={setCode} onComplete={(value) => void submit(value)} disabled={busy} invalid={Boolean(error)} autoFocus />
      {error && (
        <p role="alert" className="text-center text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" variant="gradient" className="w-full" loading={busy} disabled={code.length !== 6}>
        Verify email
      </Button>
      <ResendCode seconds={resend.seconds} sending={resend.sending} onResend={() => void resend.resend()} />
    </form>
  );
}
