"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";

type OtpPurpose = "SIGNUP_VERIFY" | "PASSWORD_RESET";

/** Resend-OTP logic with a visible cooldown that also honours the server's Retry-After. */
export function useResendCode(email: string, purpose: OtpPurpose, initialSeconds = 60) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const resend = useCallback(async () => {
    if (seconds > 0 || sending) return;
    setSending(true);
    try {
      await api.post("/api/auth/resend-otp", { email, purpose }, { notifyUnauthorized: false });
      toast.success("A new code is on its way.");
      setSeconds(60);
    } catch (error) {
      if (error instanceof ApiClientError && error.retryAfterSeconds) setSeconds(error.retryAfterSeconds);
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  }, [email, purpose, seconds, sending]);

  return { seconds, sending, resend };
}

/** "Didn't get it? Resend code (42s)" line. */
export function ResendCode({ seconds, sending, onResend }: { seconds: number; sending: boolean; onResend: () => void }) {
  return (
    <p className="text-center text-sm text-fg-muted" aria-live="polite">
      Didn&apos;t get the code?{" "}
      {seconds > 0 ? (
        <span className="font-semibold tabular-nums text-fg">Resend in {seconds}s</span>
      ) : (
        <button type="button" onClick={onResend} disabled={sending} className="font-semibold text-primary hover:underline disabled:opacity-60">
          {sending ? "Sending…" : "Resend code"}
        </button>
      )}
    </p>
  );
}
