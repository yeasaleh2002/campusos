"use client";

import "./globals.css";

/** Last-resort boundary (root layout failed): renders its own <html>, no providers. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center bg-bg px-4 text-center text-fg">
        <main className="max-w-md">
          <p className="text-6xl font-extrabold text-gradient">CampusOS</p>
          <h1 className="mt-4 text-2xl font-bold">We hit an unexpected error</h1>
          <p className="mt-2 text-fg-muted">Please reload the page. Your data is safe.</p>
          {error.digest && <p className="mt-2 text-xs text-fg-subtle">Reference: {error.digest}</p>}
          <button type="button" onClick={reset} className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-fg">
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
