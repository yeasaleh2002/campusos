"use client";

import { generateReactHelpers } from "@uploadthing/react";
import { FileText, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { type DragEvent, useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { UploadRouter } from "@/app/api/uploadthing/core";
import { ApiClientError, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type ImagePurpose = "general" | "avatar" | "event-banner" | "club-logo" | "lost-found" | "complaint" | "resource-thumbnail";

export interface UploadedImage {
  url: string;
  key: string;
  size: number;
  originalSize: number;
  compressionRatio: string;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** POST /api/upload/image with real upload progress (XHR). */
function uploadImage(file: File, purpose: ImagePurpose, onProgress: (pct: number) => void): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/image");
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 90));
    xhr.onload = () => {
      const body = xhr.response as ApiResponse<UploadedImage> | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.success) resolve(body.data);
      else reject(new ApiClientError(body && !body.success ? body.error.message : "Upload failed.", body && !body.success ? body.error.code : "UPLOAD_FAILED", xhr.status));
    };
    xhr.onerror = () => reject(new ApiClientError("Network error while uploading.", "NETWORK_ERROR", 0));
    xhr.send(form);
  });
}

interface ImageDropzoneProps {
  purpose: ImagePurpose;
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
  label?: string;
  className?: string;
}

/**
 * Drag-and-drop image uploader → server-side compression pipeline → UploadThing.
 * Shows previews, per-file progress, compression savings, and remove buttons.
 */
export function ImageDropzone({ purpose, value, onChange, max = 4, label = "Upload photos", className }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const handleFiles = async (files: File[]) => {
    const room = max - value.length;
    const accepted = files.filter((file) => {
      if (!IMAGE_TYPES.includes(file.type)) return toast.error(`${file.name}: use JPEG, PNG, WebP, AVIF or GIF.`) && false;
      if (file.size > MAX_IMAGE_BYTES) return toast.error(`${file.name} is larger than 4 MB.`) && false;
      return true;
    });
    if (accepted.length > room) toast.error(`You can add ${room} more photo${room === 1 ? "" : "s"}.`);
    const batch = accepted.slice(0, Math.max(0, room));
    let current = value;
    for (const file of batch) {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      setProgress((p) => ({ ...p, [id]: 2 }));
      try {
        const uploaded = await uploadImage(file, purpose, (pct) => setProgress((p) => ({ ...p, [id]: pct })));
        current = [...current, uploaded];
        onChange(current);
        toast.success(`Uploaded ${file.name} (${uploaded.compressionRatio} smaller)`);
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setProgress((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
      }
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void handleFiles(Array.from(event.dataTransfer.files));
  };

  const uploading = Object.entries(progress);
  const full = value.length >= max;

  return (
    <div className={cn("space-y-3", className)}>
      {!full && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
            dragging ? "border-primary bg-primary-soft/50" : "border-border-strong bg-surface-2/40 hover:border-primary/60",
          )}
        >
          <ImagePlus className="mb-2 size-8 text-primary" aria-hidden />
          <p className="text-sm font-semibold">Drag photos here</p>
          <p className="mt-1 text-xs text-fg-subtle">JPEG, PNG, WebP, AVIF or GIF · up to 4 MB · {max - value.length} left · auto-compressed</p>
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
            <UploadCloud /> {label}
          </Button>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            aria-label={label}
            accept={IMAGE_TYPES.join(",")}
            multiple={max > 1}
            className="sr-only"
            onChange={(event) => {
              void handleFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
      )}
      {uploading.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {uploading.map(([id, pct]) => (
            <div key={id} className="rounded-xl border border-border bg-surface p-3">
              <p className="mb-2 truncate text-xs font-medium">{id.split("-")[0]} - {pct < 90 ? "uploading" : "compressing"}…</p>
              <Progress value={pct < 90 ? pct : 96} label="Upload progress" />
            </div>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((image, index) => (
            <li key={image.key} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2">
              <Image src={image.url} alt={`Uploaded photo ${index + 1}`} fill sizes="(max-width: 640px) 50vw, 160px" className="object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item.key !== image.key))}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black/60 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove photo ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const { useUploadThing } = generateReactHelpers<UploadRouter>();

export interface UploadedPdf {
  url: string;
  key: string;
  name: string;
  size: number;
}

/** PDF uploader: browser → UploadThing directly (bypasses the serverless body limit). */
export function PdfDropzone({ value, onChange, className }: { value: UploadedPdf | null; onChange: (file: UploadedPdf | null) => void; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const { startUpload, isUploading } = useUploadThing("pdfUploader", {
    onUploadProgress: setProgress,
    onUploadError: (error) => {
      toast.error(error.message || "Upload failed.");
    },
  });

  const handle = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") return void toast.error("Please choose a PDF file.");
    if (file.size > 16 * 1024 * 1024) return void toast.error("PDFs must be 16 MB or smaller.");
    setProgress(0);
    const result = await startUpload([file]);
    const uploaded = result?.[0];
    if (!uploaded) return;
    onChange({ url: uploaded.serverData.url, key: uploaded.serverData.key, name: file.name, size: file.size });
    toast.success("PDF uploaded.");
  };

  if (value) {
    return (
      <div className={cn("flex items-center gap-3 rounded-2xl border border-border bg-surface p-4", className)}>
        <span className="grid size-11 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{value.name}</p>
          <p className="text-xs text-fg-subtle">{(value.size / 1024 / 1024).toFixed(2)} MB · uploaded</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label="Remove PDF"><Trash2 /></Button>
      </div>
    );
  }
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void handle(event.dataTransfer.files[0]);
      }}
      className={cn("flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong bg-surface-2/40 px-6 py-10 text-center", className)}
    >
      <FileText className="mb-2 size-8 text-primary" aria-hidden />
      <p className="text-sm font-semibold">Drop your PDF here</p>
      <p className="mt-1 text-xs text-fg-subtle">PDF only · up to 16 MB</p>
      {isUploading ? (
        <div className="mt-4 w-full max-w-xs" aria-live="polite">
          <Progress value={progress} label="PDF upload progress" />
          <p className="mt-2 text-xs text-fg-subtle">Uploading… {progress}%</p>
        </div>
      ) : (
        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
          <UploadCloud /> Choose PDF
        </Button>
      )}
      <input ref={inputRef} type="file" accept="application/pdf" aria-label="Choose a PDF file" className="sr-only" onChange={(event) => void handle(event.target.files?.[0])} />
    </div>
  );
}
