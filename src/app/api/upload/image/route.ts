import type { NextRequest } from "next/server";
import { z } from "zod";
import { created } from "@/lib/api-response";
import { BadRequestError, PayloadTooLargeError, UnsupportedMediaTypeError, withApiHandler } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { uploadImage } from "@/server/services/upload.service";
import { IMAGE_PURPOSES, MAX_IMAGE_INPUT_BYTES } from "@/server/upload/image-pipeline";

/** Vercel function time budget (seconds). */
export const maxDuration = 60;

// Runs on the Node.js runtime (Next 16 default; `export const runtime` is disallowed with Cache Components).

/** Room for multipart boundaries and the purpose field on top of the 4 MB image. */
const MAX_MULTIPART_BYTES = MAX_IMAGE_INPUT_BYTES + 64 * 1024;

const purposeSchema = z.enum(IMAGE_PURPOSES).default("general");

export const POST = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "upload-image", RATE_LIMITS.upload);
  const user = await requireAuth(request);

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    throw new UnsupportedMediaTypeError("Content-Type must be multipart/form-data.");
  }
  if (Number(request.headers.get("content-length") ?? "0") > MAX_MULTIPART_BYTES) {
    throw new PayloadTooLargeError("Images must be 4 MB or smaller.");
  }

  const form = await request.formData().catch(() => {
    throw new BadRequestError("Malformed multipart body.");
  });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new BadRequestError('Attach the image in the "file" field.');
  if (file.size > MAX_IMAGE_INPUT_BYTES) throw new PayloadTooLargeError("Images must be 4 MB or smaller.");
  const purpose = purposeSchema.parse(form.get("purpose") ?? undefined);

  const result = await uploadImage(user, new Uint8Array(await file.arrayBuffer()), purpose);
  return created(result);
});
