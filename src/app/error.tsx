"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Route-level error boundary: friendly copy, retry, no stack traces. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div id="main" role="alert" className="container-app grid min-h-[60dvh] place-items-center py-16 text-center">
      <div className="max-w-md">
        <p className="font-display text-6xl font-extrabold text-gradient">{offline ? "Offline" : "Oops"}</p>
        <h1 className="mt-4 font-display text-h3 font-bold">{offline ? "You're offline" : "Something went wrong"}</h1>
        <p className="mt-2 text-fg-muted">
          {offline ? "Check your connection, then try again." : "We couldn't load this page. Please try again - if it keeps happening, let us know via the helpdesk."}
        </p>
        {error.digest && <p className="mt-2 text-xs text-fg-subtle">Reference: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw /> Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
