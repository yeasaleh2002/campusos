import { type ReactNode, Suspense } from "react";
import { SiteBanner } from "@/components/layout/site-banner";
import { PublicTabBar } from "@/components/layout/public-tab-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ChatbotLauncher } from "@/components/shared/chatbot/chatbot-launcher";
import { Logo } from "@/components/shared/logo";

/** Static stand-in while the header (which reads the pathname) streams in. */
function HeaderFallback() {
  return (
    <div className="sticky top-0 z-40 h-16 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="container-app flex h-full items-center">
        <Logo />
      </div>
    </div>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      <Suspense fallback={null}>
        <SiteBanner />
      </Suspense>
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
      <ChatbotLauncher />
      <Suspense fallback={null}>
        <PublicTabBar />
      </Suspense>
    </div>
  );
}
