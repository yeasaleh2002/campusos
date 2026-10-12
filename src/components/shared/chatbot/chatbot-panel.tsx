"use client";

import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight, Bot, Bus, CalendarDays, ClipboardList, GraduationCap, RotateCcw, SendHorizontal, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const SESSION_KEY = "campusos-chat-session";
const MAX_LENGTH = 500;

type Level = "HIGH" | "MEDIUM" | "LOW";

interface ChatSource {
  id: string;
  title: string;
  link: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  level?: Level;
  sources?: ChatSource[];
  suggestions?: Array<{ id: string; question: string; link: string }>;
  feedback?: "HELPFUL" | "NOT_HELPFUL" | null;
  failed?: boolean;
}

interface ChatbotReply {
  sessionId: string;
  messageId: string;
  answer: string;
  level: Level;
  confidence: number;
  intent: string | null;
  answeredBy: string;
  sources: ChatSource[];
  suggestions: Array<{ id: string; question: string; link: string }>;
}

interface SessionHistory {
  sessionId: string;
  messages: Array<{ id: string; role: "USER" | "ASSISTANT"; content: string; feedback: "HELPFUL" | "NOT_HELPFUL" | null }>;
}

const QUICK_ACTIONS = [
  { label: "Next bus", question: "When is the next bus?", icon: Bus },
  { label: "Exam info", question: "What are the exam rules?", icon: GraduationCap },
  { label: "Open forms", question: "Which forms are open now?", icon: ClipboardList },
  { label: "Events this week", question: "What events are happening this week?", icon: CalendarDays },
] as const;

const SUGGESTED = ["Is the university bus free for students?", "How do I get my admit card?", "Any class cancellations today?", "mirpur er porer bus kokhon?"];

function readSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(id: string | null) {
  try {
    if (id) window.localStorage.setItem(SESSION_KEY, id);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked (private mode) - the chat still works for this page view.
  }
}

interface ChatbotPanelProps {
  open: boolean;
  onClose: () => void;
  pendingQuestion: string | null;
  onPendingConsumed: () => void;
}

/** Campus assistant: grounded answers, sources, suggestions and feedback. */
export function ChatbotPanel({ open, onClose, pendingQuestion, onPendingConsumed }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  // Restore the previous conversation once.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = readSession();
    if (!stored) return;
    api
      .get<SessionHistory>(`/api/chatbot/sessions/${encodeURIComponent(stored)}`, { notifyUnauthorized: false })
      .then((history) => {
        setSessionId(history.sessionId);
        setMessages(history.messages.map((msg) => ({ id: msg.id, role: msg.role === "USER" ? "user" : "assistant", content: msg.content, feedback: msg.feedback })));
      })
      .catch(() => writeSession(null));
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim().slice(0, MAX_LENGTH);
      if (!message || sending) return;
      const localId = `local-${Date.now()}`;
      setMessages((list) => [...list, { id: localId, role: "user", content: message }]);
      setDraft("");
      setSending(true);
      try {
        const reply = await api.post<ChatbotReply>("/api/chatbot/message", sessionId ? { sessionId, message } : { message }, { notifyUnauthorized: false });
        setSessionId(reply.sessionId);
        writeSession(reply.sessionId);
        setMessages((list) => [
          ...list,
          { id: reply.messageId, role: "assistant", content: reply.answer, level: reply.level, sources: reply.sources, suggestions: reply.suggestions, feedback: null },
        ]);
      } catch (error) {
        // A stale/foreign session → start a fresh one transparently.
        if (error instanceof ApiClientError && error.status === 404 && sessionId) {
          setSessionId(null);
          writeSession(null);
        }
        setMessages((list) => list.map((msg) => (msg.id === localId ? { ...msg, failed: true } : msg)));
        toast.error(errorMessage(error));
      } finally {
        setSending(false);
      }
    },
    [sending, sessionId],
  );

  useEffect(() => {
    if (!open || !pendingQuestion) return;
    const timer = setTimeout(() => {
      onPendingConsumed();
      void send(pendingQuestion);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, pendingQuestion, onPendingConsumed, send]);

  const giveFeedback = async (messageId: string, helpful: boolean) => {
    if (!sessionId) return;
    const value = helpful ? "HELPFUL" : "NOT_HELPFUL";
    const previous = messages.find((msg) => msg.id === messageId)?.feedback ?? null;
    setMessages((list) => list.map((msg) => (msg.id === messageId ? { ...msg, feedback: value } : msg)));
    try {
      await api.post(`/api/chatbot/messages/${messageId}/feedback`, { sessionId, helpful }, { notifyUnauthorized: false });
      toast.success(helpful ? "Thanks! Glad it helped." : "Thanks - we'll improve this answer.");
    } catch (error) {
      setMessages((list) => list.map((msg) => (msg.id === messageId ? { ...msg, feedback: previous } : msg)));
      toast.error(errorMessage(error));
    }
  };

  const reset = () => {
    setMessages([]);
    setSessionId(null);
    writeSession(null);
    inputRef.current?.focus();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <m.section
          role="dialog"
          aria-modal="false"
          aria-label="Campus assistant"
          data-chat-panel
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{ zIndex: "var(--z-chat)", transformOrigin: "bottom right" }}
          className="fixed inset-x-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] flex h-[min(42rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-lg sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[26rem]"
          onKeyDown={(event) => event.key === "Escape" && onClose()}
        >
          <header className="relative flex items-center gap-3 overflow-hidden border-b border-border px-4 py-3.5">
            <div className="absolute inset-0 bg-brand-gradient opacity-[0.07]" aria-hidden />
            <span className="relative grid size-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <Bot className="size-5" />
            </span>
            <div className="relative min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold leading-tight">Campus Assistant</h2>
              <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                <span className="size-1.5 rounded-full bg-success" aria-hidden /> Answers from verified CampusOS data
              </p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={reset} className="relative rounded-lg p-2 text-fg-subtle transition hover:bg-surface-2 hover:text-fg" aria-label="Start a new conversation" title="New conversation">
                <RotateCcw className="size-4" />
              </button>
            )}
          </header>

          <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 && <Welcome onAsk={send} />}
            {messages.map((msg) => (msg.role === "user" ? <UserBubble key={msg.id} message={msg} onRetry={() => send(msg.content)} /> : <AssistantBubble key={msg.id} message={msg} onAsk={send} onFeedback={giveFeedback} canRate={Boolean(sessionId)} />))}
            {sending && <TypingIndicator />}
          </div>

          {messages.length > 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-border px-4 pt-3">
              {QUICK_ACTIONS.map(({ label, question, icon: Icon }) => (
                <button key={label} type="button" disabled={sending} onClick={() => send(question)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-50">
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex items-end gap-2 p-3">
            <label htmlFor="chat-input" className="sr-only">Ask a question</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask in English, Banglish or বাংলা…"
              className="scrollbar-thin max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-border bg-surface-2/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-ring/30 [field-sizing:content]"
            />
            <button type="submit" disabled={!draft.trim() || sending} className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg transition hover:bg-primary-hover disabled:opacity-40" aria-label="Send message">
              <SendHorizontal className="size-5" />
            </button>
          </form>
        </m.section>
      )}
    </AnimatePresence>
  );
}

function Welcome({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div className="space-y-5 py-2">
      <div className="rounded-2xl bg-surface-2/60 p-4">
        <p className="flex items-center gap-2 font-display font-semibold">
          <Sparkles className="size-4 text-saffron" /> Hi! How can I help today?
        </p>
        <p className="mt-1.5 text-sm text-fg-muted">I answer from verified campus data - bus times, exams, admission, forms, events and notices. If I don&apos;t know, I&apos;ll say so.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(({ label, question, icon: Icon }) => (
          <button key={label} type="button" onClick={() => onAsk(question)} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg">
              <Icon className="size-4" />
            </span>
            {label}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Try asking</p>
        <ul className="space-y-1.5">
          {SUGGESTED.map((question) => (
            <li key={question}>
              <button type="button" onClick={() => onAsk(question)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg">
                “{question}”
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UserBubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end">
      <p className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-fg">{message.content}</p>
      {message.failed && (
        <button type="button" onClick={onRetry} className="mt-1 text-xs font-medium text-danger hover:underline">
          Not sent - tap to retry
        </button>
      )}
    </m.div>
  );
}

interface AssistantBubbleProps {
  message: ChatMessage;
  onAsk: (question: string) => void;
  onFeedback: (id: string, helpful: boolean) => void;
  canRate: boolean;
}

function AssistantBubble({ message, onAsk, onFeedback, canRate }: AssistantBubbleProps) {
  return (
    <m.div data-role="assistant" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg">
        <Bot className="size-4" />
      </span>
      <div className="min-w-0 max-w-[88%] space-y-2">
        <div className={cn("whitespace-pre-line break-words rounded-2xl rounded-tl-md bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed", message.level === "LOW" && "border border-warning/30 bg-warning-soft/50")}>{message.content}</div>
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.slice(0, 3).map((source) => (
              <Link key={source.id} href={source.link} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-primary transition hover:border-primary/40">
                <span className="truncate">{source.title}</span>
                <ArrowUpRight className="size-3 shrink-0" />
              </Link>
            ))}
          </div>
        )}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-fg-subtle">{message.level === "LOW" ? "Closest questions I can answer:" : "Did you mean…"}</p>
            {message.suggestions.map((suggestion) => (
              <button key={suggestion.id} type="button" onClick={() => onAsk(suggestion.question)} className="block w-full rounded-lg border border-border px-3 py-1.5 text-left text-xs text-fg-muted transition hover:border-primary/40 hover:text-fg">
                {suggestion.question}
              </button>
            ))}
          </div>
        )}
        {canRate && !message.id.startsWith("local-") && (
          <div className="flex items-center gap-1 text-fg-subtle">
            <span className="mr-1 text-xs">Helpful?</span>
            <FeedbackButton active={message.feedback === "HELPFUL"} label="Helpful" onClick={() => onFeedback(message.id, true)}>
              <ThumbsUp className="size-3.5" />
            </FeedbackButton>
            <FeedbackButton active={message.feedback === "NOT_HELPFUL"} label="Not helpful" onClick={() => onFeedback(message.id, false)}>
              <ThumbsDown className="size-3.5" />
            </FeedbackButton>
          </div>
        )}
      </div>
    </m.div>
  );
}

function FeedbackButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={label} className={cn("rounded-md p-1.5 transition hover:bg-surface-2 hover:text-fg", active && "bg-primary-soft text-primary-soft-fg")}>
      {children}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5" role="status" aria-label="Assistant is typing">
      <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg">
        <Bot className="size-4" />
      </span>
      <span className="flex gap-1 rounded-2xl rounded-tl-md bg-surface-2 px-4 py-3">
        {[0, 1, 2].map((dot) => (
          <m.span key={dot} className="size-1.5 rounded-full bg-fg-subtle" animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }} />
        ))}
      </span>
    </div>
  );
}
