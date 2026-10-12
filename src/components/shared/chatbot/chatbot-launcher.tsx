"use client";

import { AnimatePresence, m } from "framer-motion";
import { MessageCircleQuestion, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

const OPEN_CHAT_EVENT = "campusos:open-chat";

const ChatbotPanel = dynamic(() => import("@/components/shared/chatbot/chatbot-panel").then((mod) => mod.ChatbotPanel), { ssr: false });

/** Opens the assistant from anywhere, optionally asking `question` immediately. */
export function openChatbot(question?: string) {
  window.dispatchEvent(new CustomEvent<string | undefined>(OPEN_CHAT_EVENT, { detail: question }));
}

/**
 * Floating launcher (~1 kB). The panel code (and its queries) is fetched on
 * hover/focus intent or the first open, keeping it off the critical path.
 */
export function ChatbotLauncher() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const preload = useCallback(() => setLoaded(true), []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const question = (event as CustomEvent<string | undefined>).detail;
      setLoaded(true);
      setOpen(true);
      if (question) setPending(question);
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  return (
    <>
      {loaded && <ChatbotPanel open={open} onClose={() => setOpen(false)} pendingQuestion={pending} onPendingConsumed={() => setPending(null)} />}
      <m.button
        type="button"
        onClick={() => {
          setLoaded(true);
          setOpen((value) => !value);
        }}
        onPointerEnter={preload}
        onFocus={preload}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ zIndex: "var(--z-chat)" }}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 grid size-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow ring-1 ring-white/20 sm:right-6 sm:bottom-6"
        aria-label={open ? "Close campus assistant" : "Open campus assistant"}
        aria-expanded={open}
        data-chat-launcher
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span key={open ? "close" : "open"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
            {open ? <X className="size-6" /> : <MessageCircleQuestion className="size-6" />}
          </m.span>
        </AnimatePresence>
        {!open && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-accent ring-2 ring-bg animate-pulse-ring" aria-hidden />}
      </m.button>
    </>
  );
}
