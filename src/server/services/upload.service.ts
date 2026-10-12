import { nanoid } from "nanoid";
import { UTApi, UTFile } from "uploadthing/server";
import type { UploadKind } from "@/generated/prisma/enums";
import { can, Permission } from "@/lib/auth/rbac";
import { env } from "@/lib/env";
import { ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { uploadKeyFromUrl } from "@/lib/upload-url";
import type { AuthUser } from "@/server/middleware/auth";
import { type ImagePurpose, processImage } from "@/server/upload/image-pipeline";

let utapi: UTApi | undefined;

/** Server-side UploadThing client (token from env). */
export function getUtApi(): UTApi {
  utapi ??= new UTApi({ token: env.UPLOADTHING_TOKEN });
  return utapi;
}

export interface ImageUploadResult {
  url: string;
  key: string;
  size: number;
  originalSize: number;
  compressionRatio: string;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * Full image pipeline: magic-byte validation → resize per purpose → compression
 * (image-video-compressor) → UploadThing (UTApi) → UploadedFile record. Only the
 * compressed buffer is ever uploaded.
 */
export async function uploadImage(user: AuthUser, input: Uint8Array, purpose: ImagePurpose): Promise<ImageUploadResult> {
  const image = await processImage(input, purpose);
  const name = `${purpose}-${nanoid(12)}.${image.format === "jpeg" ? "jpg" : image.format}`;

  const { data, error } = await getUtApi().uploadFiles(new UTFile([Buffer.from(image.bytes)], name, { type: image.mimeType }));
  if (error || !data) {
    logger.error("UploadThing upload failed", { purpose, code: error?.code });
    throw new ServiceUnavailableError("UPLOAD_FAILED", "File storage is unavailable. Please try again.");
  }

  try {
    await prisma.uploadedFile.create({
      data: { key: data.key, url: data.ufsUrl, name, size: image.size, mimeType: image.mimeType, kind: "IMAGE", uploadedById: user.id },
      select: { id: true },
    });
  } catch (dbError) {
    // Never leave an untracked object in storage.
    await getUtApi().deleteFiles(data.key).catch(() => undefined);
    throw dbError;
  }

  return {
    url: data.ufsUrl,
    key: data.key,
    size: image.size,
    originalSize: image.originalSize,
    compressionRatio: image.compressionRatio,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
  };
}

export interface PdfUploadRecord {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

/** Records a PDF uploaded through the UploadThing FileRouter (called from onUploadComplete). */
export async function recordPdfUpload(userId: string, file: PdfUploadRecord): Promise<void> {
  await prisma.uploadedFile.upsert({
    where: { key: file.key },
    create: { key: file.key, url: file.url, name: file.name.slice(0, 255), size: file.size, mimeType: file.type, kind: "PDF", uploadedById: userId },
    update: {},
    select: { id: true },
  });
}

export interface VerifiedUpload {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

interface UploadExpectation {
  /** Accepted kind(s), e.g. "IMAGE" or ["PDF", "IMAGE"] for notice attachments. */
  kind: UploadKind | UploadKind[];
  /** Request field reported in validation errors. */
  field?: string;
  /** When set, the upload must belong to this user. */
  ownerId?: string;
}

/**
 * Proves a client-supplied URL came from our pipeline: trusted host, key tracked
 * in UploadedFile, matching URL, kind and (optionally) owner. Prevents users from
 * storing arbitrary external URLs or re-using someone else's upload.
 */
export async function verifyUpload(url: string, expected: UploadExpectation, key?: string): Promise<VerifiedUpload> {
  const urlKey = uploadKeyFromUrl(url);
  const path = expected.field ?? "fileUrl";
  if (!urlKey || (key !== undefined && key !== urlKey)) {
    throw new ValidationError(undefined, [{ path, message: "File must be uploaded through CampusOS." }]);
  }
  const record = await prisma.uploadedFile.findUnique({
    where: { key: urlKey },
    select: { key: true, url: true, size: true, mimeType: true, kind: true, uploadedById: true },
  });
  const valid =
    record !== null &&
    record.url === url &&
    (Array.isArray(expected.kind) ? expected.kind.includes(record.kind) : record.kind === expected.kind) &&
    (expected.ownerId === undefined || record.uploadedById === expected.ownerId);
  if (!valid) throw new ValidationError(undefined, [{ path, message: "Unknown or foreign upload." }]);
  return { key: record.key, url: record.url, size: record.size, mimeType: record.mimeType };
}

/** Verifies several image URLs (lost & found photos, complaint attachments) owned by the user. */
export async function verifyImageUploads(urls: readonly string[], field: string, ownerId: string): Promise<void> {
  await Promise.all(urls.map((url) => verifyUpload(url, { kind: "IMAGE", ownerId, field })));
}

/**
 * Deletes an upload from UploadThing and the database. Owner or ADMIN+ only.
 * Refuses while a resource still points at the file.
 */
export async function deleteUpload(user: AuthUser, key: string): Promise<void> {
  const record = await prisma.uploadedFile.findUnique({ where: { key }, select: { id: true, uploadedById: true } });
  if (!record) throw new NotFoundError("Upload not found.");
  if (record.uploadedById !== user.id && !can(user, Permission.UsersManage)) throw new ForbiddenError();

  const inUse = await prisma.resource.count({ where: { fileKey: key, deletedAt: null } });
  if (inUse > 0) throw new ConflictError("This file is attached to a resource. Delete the resource first.");

  const result = await getUtApi().deleteFiles(key);
  if (!result.success) throw new ServiceUnavailableError("UPLOAD_DELETE_FAILED", "Could not delete the file. Please retry.");
  await prisma.uploadedFile.delete({ where: { id: record.id } });
}
