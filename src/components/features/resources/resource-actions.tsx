"use client";

import { Bookmark, BookmarkCheck, Download, Eye, Flag } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { type ResourceCardData, useToggleBookmark } from "@/components/features/resources/resource-hooks";
import { useAuth } from "@/components/providers/auth-provider";
import { ShareButton } from "@/components/shared/share-button";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api-client";
import { toastPromise } from "@/lib/toast";

const PdfPreview = dynamic(() => import("@/components/features/resources/pdf-preview").then((mod) => mod.PdfPreview), {
  ssr: false,
  loading: () => <Skeleton className="h-[70dvh] rounded-2xl" />,
});

type ActionResource = Pick<ResourceCardData, "id" | "title" | "type" | "downloadCount" | "department" | "course">;

/** Download (counts once/day), lazy PDF preview, bookmark, share and report. */
export function ResourceActions({ resource }: { resource: ActionResource }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { bookmarked, toggle, pending } = useToggleBookmark(resource);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloads, setDownloads] = useState(resource.downloadCount);
  const [busy, setBusy] = useState<"download" | "preview" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const requireLogin = () => {
    toast("Sign in to download and preview files.", { icon: "🔒" });
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
  };

  const fetchFile = async (mode: "download" | "preview") => {
    if (!user) return requireLogin();
    setBusy(mode);
    try {
      const result = await api.post<{ fileUrl: string; downloadCount: number }>(`/api/resources/${resource.id}/download`);
      setDownloads(result.downloadCount);
      if (mode === "preview") {
        setPreviewUrl(result.fileUrl);
      } else {
        window.open(result.fileUrl, "_blank", "noopener,noreferrer");
        toast.success("Download started.");
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const submitReport = async () => {
    if (reason.trim().length < 10) return void toast.error("Please describe the problem (at least 10 characters).");
    setReporting(true);
    try {
      await toastPromise(
        api.post("/api/complaints", {
          category: "OTHER",
          subject: `Resource report: ${resource.title}`.slice(0, 150),
          description: `Reported resource ${resource.id} (${resource.title}).\n\nReason: ${reason.trim()}`,
          isAnonymous: false,
        }),
        { loading: "Sending report…", success: "Thanks - moderators will review this resource." },
      );
      setReportOpen(false);
      setReason("");
    } catch {
      // toast shown
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="gradient" size="lg" onClick={() => void fetchFile("download")} loading={busy === "download"}>
          <Download /> Download PDF
        </Button>
        <Button variant="secondary" size="lg" onClick={() => void fetchFile("preview")} loading={busy === "preview"} disabled={Boolean(previewUrl)}>
          <Eye /> Preview
        </Button>
        <Button variant={bookmarked ? "soft" : "secondary"} size="lg" aria-pressed={bookmarked} onClick={toggle} disabled={pending}>
          {bookmarked ? <BookmarkCheck /> : <Bookmark />} {bookmarked ? "Bookmarked" : "Bookmark"}
        </Button>
        <ShareButton size="lg" title={resource.title} text={`${resource.title} - City University`} />
        <Button
          variant="ghost"
          size="lg"
          onClick={() => {
            if (!user) return requireLogin();
            setReportOpen(true);
          }}
        >
          <Flag /> Report
        </Button>
      </div>
      <p className="text-sm text-fg-subtle">{downloads.toLocaleString("en-US")} downloads</p>

      {previewUrl && <PdfPreview url={previewUrl} title={resource.title} onClose={() => setPreviewUrl(null)} />}

      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report this resource"
        description="Wrong course, unreadable scan or inappropriate content? Tell the moderators."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)} disabled={reporting}>
              Cancel
            </Button>
            <Button onClick={() => void submitReport()} loading={reporting}>
              Send report
            </Button>
          </>
        }
      >
        <Field label="What is wrong?" required>
          <Textarea rows={4} maxLength={1500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. This is CSE-2201 material, but it is filed under CSE-2101." />
        </Field>
      </Dialog>
    </div>
  );
}
