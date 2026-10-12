"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";
import { Toaster } from "react-hot-toast";
import { makeQueryClient } from "@/lib/query-client";
import { AuthProvider } from "@/components/providers/auth-provider";

const loadMotionFeatures = () => import("@/components/providers/motion-features").then((module) => module.default);

/**
 * Client providers. LazyMotion loads domAnimation on demand (a separate chunk, not in the first
 * payload) - components use `m.*`, not `motion.*`. MotionConfig honours
 * prefers-reduced-motion everywhere.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="campusos-theme">
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionConfig reducedMotion="user">
            <AuthProvider>{children}</AuthProvider>
            <Toaster
              position="top-center"
              gutter={10}
              containerStyle={{ zIndex: 70, top: 72 }}
              toastOptions={{
                duration: 4000,
                className: "!rounded-xl !border !border-border !bg-surface !text-fg !shadow-lg !text-sm !font-medium !px-4 !py-3",
                success: { iconTheme: { primary: "var(--success)", secondary: "var(--surface)" } },
                error: { duration: 6000, iconTheme: { primary: "var(--danger)", secondary: "var(--surface)" } },
              }}
            />
          </MotionConfig>
        </LazyMotion>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
