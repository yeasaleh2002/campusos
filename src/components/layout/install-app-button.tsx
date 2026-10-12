"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/** Chromium fires this before it would show its own install bar. It is not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * "Install app" button for the footer. Where the browser offers the install prompt (Chrome, Edge, Android) it opens
 * it; elsewhere (Safari on iPhone and iPad, Firefox) it shows the manual steps. Hidden once the app is installed.
 */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setInstalled(isStandalone());
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    });
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!deferred) {
      setHelpOpen(true);
      return;
    }
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <>
      <Button variant="secondary" size="lg" onClick={() => void install()} className="sheen">
        <Download /> Install CampusOS app
      </Button>
      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Install CampusOS"
        description="Add CampusOS to your home screen or desktop and open it like an app."
        footer={<Button onClick={() => setHelpOpen(false)}>Got it</Button>}
      >
        {ios ? (
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Share className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /> Tap the <strong>Share</strong> button in Safari.
            </li>
            <li className="flex items-start gap-3">
              <SquarePlus className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /> Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </li>
          </ol>
        ) : (
          <ul className="space-y-3 text-sm text-fg-muted">
            <li>
              <strong className="text-fg">Chrome or Edge:</strong> use the install icon at the right end of the address bar, or open the browser menu and choose <strong>Install CampusOS</strong>.
            </li>
            <li>
              <strong className="text-fg">Android:</strong> open the browser menu and choose <strong>Add to Home screen</strong>.
            </li>
            <li>
              <strong className="text-fg">iPhone or iPad:</strong> open this page in Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
            </li>
          </ul>
        )}
      </Dialog>
    </>
  );
}
