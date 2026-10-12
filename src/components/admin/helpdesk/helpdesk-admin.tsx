"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookPlus, CheckCheck, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAdminRole } from "@/components/admin/admin-nav";
import { BarChart, DonutChart } from "@/components/admin/charts";
import { AdminList, AdminPage, Panel, Toolbar } from "@/components/admin/kit";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api, errorMessage, fieldErrors } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";
import { KB_CATEGORY, labelOf, optionsOf } from "@/lib/labels";
import { toast, toastPromise } from "@/lib/toast";

interface EntryRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  isPublished: boolean;
  isSample: boolean;
  sourceType: string;
  viewCount: number;
  updatedAt: string;
}

interface GapRow {
  id: string;
  question: string;
  answer: string | null;
  confidence: number | null;
  createdAt: string;
}

interface Analytics {
  totals: { questions: number; answered: number; unanswered: number; helpful: number; notHelpful: number };
  confidence: Array<{ bucket: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
}

interface EntryValues {
  category: string;
  question: string;
  answer: string;
  keywords: string;
}

const parseKeywords = (text: string) => text.split(",").map((word) => word.trim()).filter(Boolean);

function EntryDialog({ entry, seed, onClose, onSave }: { entry: EntryRow | null; seed?: { question: string }; onClose: () => void; onSave: (payload: Record<string, unknown>, id?: string) => Promise<unknown> }) {
  const [published, setPublished] = useState(entry?.isPublished ?? true);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntryValues>({ defaultValues: { category: entry?.category ?? "GENERAL", question: entry?.question ?? seed?.question ?? "", answer: entry?.answer ?? "", keywords: entry?.keywords.join(", ") ?? "" } });
  const submit = handleSubmit(async (values) => {
    try {
      await onSave({ category: values.category, question: values.question, answer: values.answer, keywords: parseKeywords(values.keywords), isPublished: published }, entry?.id);
      onClose();
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof EntryValues, { message });
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={entry ? "Edit answer" : "New knowledge entry"}
      description="The chatbot and the public helpdesk answer from these entries only."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={isSubmitting}>
            {entry ? "Save" : "Create entry"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Category" required>
          <Select {...register("category")}>
            {optionsOf(KB_CATEGORY).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Question" required error={errors.question?.message}>
          <Input {...register("question", { required: "Add the question.", minLength: { value: 5, message: "Use at least 5 characters." } })} maxLength={300} />
        </Field>
        <Field label="Answer" required error={errors.answer?.message}>
          <Textarea {...register("answer", { required: "Add the answer.", minLength: { value: 5, message: "Use at least 5 characters." } })} rows={6} maxLength={4000} />
        </Field>
        <Field label="Keywords" hint="Comma separated. Help the chatbot find this answer (max 20)." error={errors.keywords?.message}>
          <Input {...register("keywords")} placeholder="bus, schedule, timing" />
        </Field>
        <Switch checked={published} onCheckedChange={setPublished} label="Published" description="Unpublished entries are hidden from the helpdesk and the chatbot." />
      </form>
    </Dialog>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const template = JSON.stringify([{ category: "GENERAL", question: "When does the library open?", answer: "9:00 AM to 8:00 PM, Friday to Tuesday.", keywords: ["library", "hours"], isPublished: true }], null, 2);

  const run = async () => {
    let entries: unknown;
    try {
      entries = JSON.parse(text);
    } catch {
      toast.error("That is not valid JSON. Check commas and quotes.");
      return;
    }
    if (!Array.isArray(entries)) {
      toast.error("Expected a JSON array of entries.");
      return;
    }
    setBusy(true);
    try {
      const result = await toastPromise(api.post<{ created: number; skipped: string[] }>("/api/admin/helpdesk/import", { entries, skipDuplicates: true }), {
        loading: "Importing…",
        success: (value) => `Imported ${(value as { created: number }).created} entries. Public helpdesk and chatbot updated ✓`,
      });
      if (result.skipped.length) toast(`${result.skipped.length} duplicate question(s) were skipped.`);
      onDone();
      onClose();
    } catch {
      // toastPromise already explained the failure.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Import entries from JSON"
      description="Up to 500 entries per import. Questions that already exist are skipped."
      footer={
        <>
          <Button variant="secondary" onClick={() => setText(template)}>
            Insert example
          </Button>
          <Button onClick={() => void run()} loading={busy} disabled={text.trim().length < 2}>
            <Upload /> Import
          </Button>
        </>
      }
    >
      <Field label="JSON array">
        <Textarea value={text} onChange={(event) => setText(event.target.value)} rows={12} spellCheck={false} className="font-mono text-xs" placeholder={template} />
      </Field>
    </Dialog>
  );
}

function EntriesTab() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState("");
  const [editing, setEditing] = useState<EntryRow | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<EntryRow | null>(null);
  const entries = useAdminCollection<EntryRow>("kb", "/api/admin/helpdesk/entries", { q, category, published });

  const save = (payload: Record<string, unknown>, id?: string) =>
    entries.mutate({ request: () => (id ? api.patch(`/api/admin/helpdesk/entries/${id}`, payload) : api.post("/api/admin/helpdesk/entries", payload)), loading: "Saving…", success: id ? "Entry saved." : "Entry created.", publicSite: true });

  const togglePublished = (row: EntryRow) =>
    entries.mutate(
      { request: () => api.patch(`/api/admin/helpdesk/entries/${row.id}`, { isPublished: !row.isPublished }), loading: row.isPublished ? "Unpublishing…" : "Publishing…", success: row.isPublished ? "Entry hidden." : "Entry published.", publicSite: true },
      entries.patchItem(row.id, { isPublished: !row.isPublished }),
    ).catch(() => undefined);

  const columns: Array<Column<EntryRow>> = [
    {
      key: "question",
      header: "Question",
      sortValue: (row) => row.question.toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="max-w-md truncate font-semibold">{row.question}</p>
          <p className="max-w-md truncate text-xs text-fg-subtle">{row.answer}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (row) => <Badge tone={labelOf(KB_CATEGORY, row.category).tone}>{labelOf(KB_CATEGORY, row.category).label}</Badge> },
    { key: "views", header: "Views", cell: (row) => row.viewCount, sortValue: (row) => row.viewCount },
    {
      key: "published",
      header: "Published",
      cell: (row) => <Switch checked={row.isPublished} onCheckedChange={() => void togglePublished(row)} label={<span className="sr-only">Published: {row.question}</span>} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${row.question}`} onClick={() => setEditing(row)}>
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Delete ${row.question}`} onClick={() => setDeleting(row)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminList
        list={entries}
        columns={columns}
        caption="Knowledge base entries"
        emptyTitle="No entries yet"
        emptyDescription="Add the questions students ask most, or import a JSON file."
        toolbar={
          <Toolbar>
            <SearchBar value={q} onSearch={setQ} placeholder="Search questions…" label="Search entries" />
            <Select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {optionsOf(KB_CATEGORY).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter by published state" value={published} onChange={(event) => setPublished(event.target.value)}>
              <option value="">Published and hidden</option>
              <option value="true">Published</option>
              <option value="false">Hidden</option>
            </Select>
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload /> Import JSON
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus /> New entry
            </Button>
          </Toolbar>
        }
      />
      {editing && <EntryDialog key={editing === "new" ? "new" : editing.id} entry={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={() => void entries.refetch()} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this entry?"
        description="The chatbot will stop answering this question."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void entries.mutate({ request: () => api.delete(`/api/admin/helpdesk/entries/${target.id}`), loading: "Deleting…", success: "Entry deleted.", publicSite: true }, entries.removeItem(target.id)).catch(() => undefined);
        }}
      />
    </>
  );
}

function GapsTab({ type, canWrite }: { type: "unanswered" | "unhelpful"; canWrite: boolean }) {
  const gaps = useAdminCollection<GapRow>(`gaps-${type}`, "/api/admin/chatbot/unanswered", { type });
  const queryClient = useQueryClient();
  const [converting, setConverting] = useState<GapRow | null>(null);

  const convert = async (payload: Record<string, unknown>) => {
    if (!converting) return;
    const gap = converting;
    await toastPromise(api.post("/api/admin/helpdesk/entries", payload), { loading: "Creating entry…", success: "Entry created: the chatbot can answer this now. Public site updated ✓" });
    void queryClient.invalidateQueries({ queryKey: ["admin", "kb"] });
    if (type === "unanswered") await gaps.mutate({ request: () => api.post(`/api/admin/chatbot/unanswered/${gap.id}/resolve`, {}), loading: "Clearing from inbox…", success: "Removed from the inbox." }, gaps.removeItem(gap.id));
  };

  const dismiss = (row: GapRow) => gaps.mutate({ request: () => api.post(`/api/admin/chatbot/unanswered/${row.id}/resolve`, {}), loading: "Dismissing…", success: "Dismissed." }, gaps.removeItem(row.id)).catch(() => undefined);

  const columns: Array<Column<GapRow>> = [
    {
      key: "question",
      header: "Question",
      cell: (row) => (
        <div className="min-w-0">
          <p className="max-w-lg font-semibold">{row.question || "(unknown)"}</p>
          {row.answer && <p className="mt-1 max-w-lg truncate text-xs text-fg-subtle">Bot said: {row.answer}</p>}
        </div>
      ),
    },
    { key: "confidence", header: "Confidence", cell: (row) => (row.confidence === null ? "-" : `${Math.round(row.confidence * 100)}%`) },
    { key: "asked", header: "Asked", cell: (row) => formatRelative(row.createdAt), sortValue: (row) => row.createdAt },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) =>
        canWrite ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="soft" onClick={() => setConverting(row)}>
              <BookPlus /> Create entry
            </Button>
            {type === "unanswered" && (
              <Button size="icon-sm" variant="ghost" aria-label="Dismiss question" title="Dismiss" onClick={() => void dismiss(row)}>
                <CheckCheck />
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <AdminList list={gaps} columns={columns} caption={type === "unanswered" ? "Unanswered chatbot questions" : "Answers marked unhelpful"} emptyTitle={type === "unanswered" ? "Nothing unanswered" : "No unhelpful answers"} emptyDescription="The chatbot is keeping up with what students ask." />
      {converting && <EntryDialog entry={null} seed={{ question: converting.question }} onClose={() => setConverting(null)} onSave={convert} />}
    </>
  );
}

function AnalyticsTab() {
  const analytics = useQuery({ queryKey: ["admin", "chatbot-analytics"], queryFn: () => api.get<Analytics>("/api/admin/chatbot/analytics") });
  if (analytics.isPending) return <Skeleton className="h-72 rounded-2xl" />;
  if (analytics.isError) return <p role="alert" className="text-sm text-danger">{errorMessage(analytics.error)}</p>;
  const { totals, confidence, topIntents } = analytics.data;
  const rated = totals.helpful + totals.notHelpful;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel title="Answered vs unanswered" description="Questions in the last 30 days.">
        <DonutChart label="Answered versus unanswered questions" data={[{ label: "Answered", value: totals.answered, color: "var(--success)" }, { label: "Unanswered", value: totals.unanswered, color: "var(--danger)" }]} />
      </Panel>
      <Panel title="User feedback" description={rated ? `${Math.round((totals.helpful / rated) * 100)}% of rated answers were helpful.` : "No ratings yet."}>
        <DonutChart label="Helpful versus unhelpful answers" data={[{ label: "Helpful", value: totals.helpful, color: "var(--success)" }, { label: "Not helpful", value: totals.notHelpful, color: "var(--saffron)" }]} />
      </Panel>
      <Panel title="Confidence distribution" description="How sure the retrieval was about its answers.">
        <BarChart label="Answers by confidence bucket" data={confidence.map((row) => ({ label: row.bucket, value: row.count }))} />
      </Panel>
      <Panel title="Top intents" description="Questions answered by built-in intents (bus, notices...).">
        {topIntents.length === 0 ? <p className="py-8 text-center text-sm text-fg-subtle">No intent answers yet.</p> : <BarChart label="Top chatbot intents" tone="var(--primary)" data={topIntents.map((row) => ({ label: row.intent.toLowerCase().replaceAll("_", " "), value: row.count }))} />}
      </Panel>
    </div>
  );
}

type Tab = "entries" | "gaps" | "unhelpful" | "analytics";

export function HelpdeskAdmin() {
  const { user } = useAuth();
  const canWrite = isAdminRole(user?.role);
  const params = useSearchParams();
  const initial = params.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(initial ?? (canWrite ? "entries" : "gaps"));
  const items: Array<{ value: Tab; label: string }> = [
    ...(canWrite ? [{ value: "entries" as const, label: "Knowledge base" }] : []),
    { value: "gaps", label: "Unanswered" },
    { value: "unhelpful", label: "Unhelpful answers" },
    { value: "analytics", label: "Analytics" },
  ];
  const current = items.some((item) => item.value === tab) ? tab : items[0].value;

  return (
    <AdminPage title="Helpdesk & chatbot" description="Write the answers the chatbot gives, and close the gaps it could not answer.">
      <Tabs label="Helpdesk sections" value={current} onValueChange={setTab} items={items} />
      {current === "entries" && canWrite && <EntriesTab />}
      {current === "gaps" && <GapsTab type="unanswered" canWrite={canWrite} />}
      {current === "unhelpful" && <GapsTab type="unhelpful" canWrite={canWrite} />}
      {current === "analytics" && <AnalyticsTab />}
    </AdminPage>
  );
}
