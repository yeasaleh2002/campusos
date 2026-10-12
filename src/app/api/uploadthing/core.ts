import type { NextRequest } from "next/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { getUtApi, recordPdfUpload } from "@/server/services/upload.service";

const f = createUploadthing();

const PDF_MAGIC = "%PDF-";

/** UploadThing trusts the client-declared type; re-check the stored bytes. */
async function isRealPdf(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-4" }, signal: AbortSignal.timeout(10_000) });
    const head = new TextDecoder().decode((await response.arrayBuffer()).slice(0, PDF_MAGIC.length));
    return head === PDF_MAGIC;
  } catch {
    return false;
  }
}

/**
 * Direct-to-storage uploads (bypass the serverless body limit). Clients upload
 * the PDF straight to UploadThing; this router authorises the request and records
 * the result so resource creation can verify ownership of the key.
 */
export const uploadRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const user = await getAuthUser(req as NextRequest);
      if (!user) throw new UploadThingError({ code: "FORBIDDEN", message: "Sign in to upload files." });
      try {
        await rateLimitByIp(req, "upload-pdf", RATE_LIMITS.upload);
      } catch {
        throw new UploadThingError({ code: "FILE_LIMIT_EXCEEDED", message: "Too many uploads. Please wait a few minutes." });
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      if (!(await isRealPdf(file.ufsUrl))) {
        logger.warn("Rejected non-PDF upload", { key: file.key });
        await getUtApi().deleteFiles(file.key);
        throw new UploadThingError({ code: "BAD_REQUEST", message: "The file is not a valid PDF." });
      }
      await recordPdfUpload(metadata.userId, {
        key: file.key,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: "application/pdf",
      });
      return { url: file.ufsUrl, key: file.key };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
