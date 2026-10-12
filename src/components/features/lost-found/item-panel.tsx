"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Hourglass, Mail, Phone, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { invalidateLostFound } from "@/lib/query-client";
import { formatRelative } from "@/lib/format";
import { CLAIM_STATUS, labelOf } from "@/lib/labels";
import { toast, toastPromise } from "@/lib/toast";

interface Viewer {
  isReporter: boolean;
  myClaim: { id: string; status: string } | null;
  contact: { name: string; email: string; phone: string | null } | null;
}

interface ItemLive {
  id: string;
  status: string;
  contactVisible?: boolean;
  viewer: Viewer;
  _count: { claims: number };
}

interface ClaimRow {
  id: string;
  message: string;
  status: string;
  createdAt: string;
  claimer: { id: string; name: string; studentId: string | null };
}

function ContactCard({ contact }: { contact: NonNullable<Viewer["contact"]> }) {
  return (
    <div className="rounded-2xl border border-success/30 bg-success-soft/50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-success">
        <ShieldCheck className="size-4" /> Contact shared with you
      </p>
      <p className="mt-2 font-semibold">{contact.name}</p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        <Mail className="size-4 text-fg-subtle" /> <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
      </p>
      {contact.phone && (
        <p className="mt-1 flex items-center gap-2 text-sm">
          <Phone className="size-4 text-fg-subtle" /> <a href={`tel:${contact.phone}`} className="text-primary hover:underline">{contact.phone}</a>
        </p>
      )}
      <p className="mt-3 text-xs text-fg-subtle">Meet in a public place on campus and verify ownership before handing over.</p>
    </div>
  );
}

function ClaimForm({ itemId, onDone }: { itemId: string; onDone: () => void }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (message.trim().length < 10) return setError("Describe something only the owner would know (10+ characters).");
    setError(null);
    setBusy(true);
    try {
      await toastPromise(api.post(`/api/lost-found/${itemId}/claim`, { message: message.trim() }), { loading: "Sending claim…", success: "Claim sent. The reporter has been notified." });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Prove it is yours" error={error ?? undefined} hint="Mention unique marks, contents or colours - not visible in the photos.">
        <Textarea rows={4} maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="e.g. Black leather wallet; has my NID (Rahim) and a CU library card inside." />
      </Field>
      <Button variant="gradient" className="w-full" onClick={() => void submit()} loading={busy}>
        Claim this item
      </Button>
    </div>
  );
}

function ClaimsManager({ itemId, status }: { itemId: string; status: string }) {
  const queryClient = useQueryClient();
  const claims = useQuery({ queryKey: ["lost-found", itemId, "claims"], queryFn: () => api.get<ClaimRow[]>(`/api/lost-found/${itemId}/claims`) });
  const decide = useMutation({
    mutationFn: ({ claimId, decision }: { claimId: string; decision: "APPROVE" | "REJECT" }) => api.patch(`/api/lost-found/${itemId}/claims/${claimId}`, { decision }),
    onSettled: () => invalidateLostFound(queryClient),
  });

  if (claims.isPending) return <Skeleton className="h-24 rounded-xl" />;
  if (claims.isError) return <ErrorState error={claims.error} onRetry={() => void claims.refetch()} />;
  if (claims.data.length === 0) return <p className="rounded-xl bg-surface-2 p-4 text-sm text-fg-muted">No claims yet. You will be notified when someone claims this item.</p>;

  return (
    <ul className="space-y-3">
      {claims.data.map((claim) => {
        const claimStatus = labelOf(CLAIM_STATUS, claim.status);
        return (
          <li key={claim.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {claim.claimer.name} {claim.claimer.studentId && <span className="text-xs font-normal text-fg-subtle">· {claim.claimer.studentId}</span>}
              </p>
              <Badge tone={claimStatus.tone}>{claimStatus.label}</Badge>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-fg-muted [overflow-wrap:anywhere]">{claim.message}</p>
            <p className="mt-1 text-xs text-fg-subtle">{formatRelative(claim.createdAt)}</p>
            {claim.status === "PENDING" && status === "OPEN" && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="accent"
                  disabled={decide.isPending}
                  onClick={() => void toastPromise(decide.mutateAsync({ claimId: claim.id, decision: "APPROVE" }), { loading: "Approving…", success: "Approved - contact details are now shared." }).catch(() => undefined)}
                >
                  <CheckCircle2 /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={decide.isPending}
                  onClick={() => void toastPromise(decide.mutateAsync({ claimId: claim.id, decision: "REJECT" }), { loading: "Rejecting…", success: "Claim rejected." }).catch(() => undefined)}
                >
                  Reject
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Per-viewer actions on a lost & found post: claim, contact reveal, or reporter management. */
export function ItemPanel({ itemId }: { itemId: string }) {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const live = useQuery({
    queryKey: ["lost-found", itemId, "live", user?.id ?? "guest"],
    queryFn: () => api.get<ItemLive>(`/api/lost-found/${itemId}`, { notifyUnauthorized: false }),
    enabled: authStatus !== "loading",
  });
  const refresh = () => {
    void invalidateLostFound(queryClient);
    router.refresh();
  };

  const patch = async (path: string, body: unknown, messages: { loading: string; success: string }) => {
    setBusy(true);
    try {
      await toastPromise(api.patch(`/api/lost-found/${itemId}${path}`, body), messages);
      refresh();
    } catch {
      // toast shown
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await toastPromise(api.delete(`/api/lost-found/${itemId}`), { loading: "Deleting…", success: "Post deleted." });
      await invalidateLostFound(queryClient);
      router.replace("/lost-found");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  if (live.isPending || authStatus === "loading") return <Skeleton className="h-56 rounded-2xl" />;
  if (live.isError) return <ErrorState error={live.error} onRetry={() => void live.refetch()} />;

  const item = live.data;
  const { viewer } = item;
  const open = item.status === "OPEN";

  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-md" aria-label="Actions">
      {authStatus === "guest" && (
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">Sign in to claim this item or contact the reporter.</p>
          <Button variant="gradient" className="w-full" onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}>
            Sign in to claim
          </Button>
        </div>
      )}

      {authStatus === "authenticated" && !viewer.isReporter && (
        <>
          {viewer.myClaim?.status === "PENDING" && (
            <p className="flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-sm font-semibold text-warning">
              <Hourglass className="size-4" /> Your claim is waiting for the reporter.
            </p>
          )}
          {viewer.myClaim?.status === "APPROVED" && (
            <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" /> Your claim was approved.
            </p>
          )}
          {viewer.myClaim?.status === "REJECTED" && <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">Your last claim was declined - you can try again with more detail.</p>}
          {open && (!viewer.myClaim || viewer.myClaim.status === "REJECTED") && <ClaimForm itemId={itemId} onDone={refresh} />}
          {!open && !viewer.myClaim && <p className="text-sm text-fg-muted">This item is no longer open for claims.</p>}
          {viewer.contact && <ContactCard contact={viewer.contact} />}
        </>
      )}

      {viewer.isReporter && (
        <div className="space-y-5">
          <div>
            <h2 className="mb-3 font-display text-base font-semibold">Claims ({item._count.claims})</h2>
            <ClaimsManager itemId={itemId} status={item.status} />
          </div>
          {viewer.contact && <ContactCard contact={viewer.contact} />}
          {item.status === "OPEN" && (
            <Switch
              checked={Boolean(item.contactVisible)}
              disabled={busy}
              onCheckedChange={(checked) => void patch("", { contactVisible: checked }, { loading: "Saving…", success: checked ? "Approved claimers can now see your contact." : "Your contact stays private." })}
              label="Share my contact with an approved claimer"
            />
          )}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {item.status !== "RESOLVED" && (
              <Button variant="accent" size="sm" disabled={busy} onClick={() => void patch("/status", { status: "RESOLVED" }, { loading: "Updating…", success: "Marked as returned. Thank you!" })}>
                <CheckCircle2 /> Mark as returned
              </Button>
            )}
            {item.status === "CLAIMED" && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void patch("/status", { status: "OPEN" }, { loading: "Reopening…", success: "Post reopened." })}>
                <Undo2 /> Claim fell through
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </Button>
          </div>
          <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this post?" description="It disappears from the board. This cannot be undone." confirmLabel="Delete post" destructive loading={busy} onConfirm={() => void remove()} />
        </div>
      )}
    </aside>
  );
}
