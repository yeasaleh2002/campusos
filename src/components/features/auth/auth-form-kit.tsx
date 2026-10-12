"use client";

import { type ComponentProps, type ReactElement, useCallback, useEffect, useRef } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { publicEnv } from "@/config/public-env";
import { api, fieldErrors } from "@/lib/api-client";

interface FormTokenResponse {
  formToken: string;
  minAgeSeconds: number;
  maxAgeSeconds: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bot protection, invisible to humans: fetches a signed render-time token on
 * mount and, at submit, waits out the minimum age (bots submit instantly) or
 * fetches a fresh token if the old one expired.
 */
export function useFormToken() {
  const state = useRef<{ token: string; issuedAt: number; minMs: number; maxMs: number } | null>(null);
  const pending = useRef<Promise<void> | null>(null);

  const load = useCallback(() => {
    pending.current = api
      .get<FormTokenResponse>("/api/security/form-token", { notifyUnauthorized: false })
      .then((data) => {
        state.current = { token: data.formToken, issuedAt: Date.now(), minMs: data.minAgeSeconds * 1000, maxMs: data.maxAgeSeconds * 1000 };
      })
      .catch(() => {
        state.current = null;
      });
    return pending.current;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Resolves to a valid token (or undefined if the endpoint is unreachable - the server then reports it). */
  return useCallback(async (): Promise<string | undefined> => {
    if (pending.current) await pending.current;
    if (!state.current || Date.now() - state.current.issuedAt > state.current.maxMs - 5_000) {
      await load();
    }
    const current = state.current;
    if (!current) return undefined;
    const wait = current.minMs + 150 - (Date.now() - current.issuedAt);
    if (wait > 0) await sleep(wait);
    return current.token;
  }, [load]);
}

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let turnstileScript: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  turnstileScript ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable")));
    script.onerror = () => {
      turnstileScript = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return turnstileScript;
}

const TURNSTILE_WAIT_MS = 20_000;

/**
 * Cloudflare Turnstile. Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (the
 * server then skips the check too). `getToken()` resolves to a fresh single-use token, waiting
 * for the challenge if it is still running, and re-arms the widget for the next attempt.
 */
export function useTurnstile(): { widget: ReactElement | null; getToken: () => Promise<string | undefined> } {
  const siteKey = publicEnv.turnstileSiteKey;
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef<Array<(value: string | undefined) => void>>([]);

  const settle = useCallback((value: string | undefined) => {
    token.current = value ?? null;
    if (value) for (const resolve of waiting.current.splice(0)) resolve(value);
  }, []);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let cancelled = false;
    const element = container.current;
    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId.current = api.render(element, {
          sitekey: siteKey,
          theme: "auto",
          callback: (value: string) => settle(value),
          "expired-callback": () => settle(undefined),
          "error-callback": () => settle(undefined),
        });
      })
      .catch(() => settle(undefined));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, settle]);

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!siteKey) return undefined;
    const ready =
      token.current ??
      (await new Promise<string | undefined>((resolve) => {
        waiting.current.push(resolve);
        setTimeout(() => resolve(undefined), TURNSTILE_WAIT_MS);
      }));
    // Tokens are single use: arm the widget for a retry right away.
    token.current = null;
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    return ready;
  }, [siteKey]);

  const widget = siteKey ? <div ref={container} className="flex min-h-[65px] justify-center" aria-label="Security check" /> : null;
  return { widget, getToken };
}

/**
 * Honeypot field. Humans never see or tab to it; naive bots fill every input.
 * Register it with react-hook-form as `website`.
 */
export function Honeypot(props: ComponentProps<"input">) {
  return (
    <div aria-hidden className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  );
}

/** Copies server VALIDATION_ERROR details onto form fields; returns true if any matched. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: ReadonlyArray<Path<T>>): boolean {
  const errors = fieldErrors(error);
  let matched = false;
  for (const field of fields) {
    const message = errors[field];
    if (message) {
      setError(field, { type: "server", message }, { shouldFocus: !matched });
      matched = true;
    }
  }
  return matched;
}

/** Only allow same-site relative paths as post-login destinations (no open redirects). */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/signup") || value.startsWith("/api")) return fallback;
  return value;
}
