"use client";

import { m } from "framer-motion";
import { type ReactNode, useEffect } from "react";

/** False for the server render + first paint, so SSR HTML is never hidden (protects LCP). */
let hasHydrated = false;

/**
 * Route-change fade/slide used by each route group's template.tsx. Animates
 * only client-side navigations (opacity + transform only - GPU friendly).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const animateIn = hasHydrated;
  useEffect(() => {
    hasHydrated = true;
  }, []);
  return (
    <m.div initial={animateIn ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </m.div>
  );
}
