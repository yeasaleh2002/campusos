import { type ReactNode, Suspense } from "react";
import { SiteBanner } from "@/components/layout/site-banner";
import { UserShell } from "@/components/layout/user-shell";
import { ChatbotLauncher } from "@/components/shared/chatbot/chatbot-launcher";
import { Skeleton } from "@/components/ui/skeleton";

/** Signed-in portal: rendered after the session loads, so it is exempt from instant-navigation validation. */
export const instant = false;

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <SiteBanner />
      </Suspense>
      <Suspense fallback={<Skeleton className="m-6 h-96 rounded-2xl" />}>
        <UserShell>{children}</UserShell>
      </Suspense>
      <ChatbotLauncher />
    </>
  );
}
