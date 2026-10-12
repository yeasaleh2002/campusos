import { createNodeOptimizer, type DetectedMedia, detectMedia, type MediaOptimizer, OptimizerError } from "image-video-compressor";
import sharp from "sharp";
import { AppError, PayloadTooLargeError, ServiceUnavailableError, UnsupportedMediaTypeError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Max accepted input size for images (before compression). */
export const MAX_IMAGE_INPUT_BYTES = 4 * 1024 * 1024;

export const IMAGE_PURPOSES = [
  "general",
  "avatar",
  "event-banner",
  "club-logo",
  "lost-found",
  "complaint",
  "resource-thumbnail",
] as const;
export type ImagePurpose = (typeof IMAGE_PURPOSES)[number];

/** Longest-edge bounds per purpose; larger images are scaled down (never up). */
const PURPOSE_BOUNDS: Record<ImagePurpose, { width: number; height: number }> = {
  general: { width: 1600, height: 1600 },
  avatar: { width: 512, height: 512 },
  "club-logo": { width: 512, height: 512 },
  "event-banner": { width: 1920, height: 1080 },
  "lost-found": { width: 1600, height: 1600 },
  complaint: { width: 1600, height: 1600 },
  "resource-thumbnail": { width: 800, height: 800 },
};

const ALLOWED_INPUT_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif"]);

const OUTPUT_MIME: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
};

export interface ProcessedImage {
  bytes: Uint8Array;
  format: string;
  mimeType: string;
  originalSize: number;
  size: number;
  compressionRatio: string;
  width?: number;
  height?: number;
}

let optimizer: MediaOptimizer | undefined;

/** One optimizer per process (its concurrency limits are per instance). */
function getOptimizer(): MediaOptimizer {
  optimizer ??= createNodeOptimizer({
    limits: { maxImageBytes: 16 * 1024 * 1024, maxDimension: 10_000, maxPixels: 40_000_000 },
    concurrency: { maxImageJobs: 2, maxQueue: 16 },
  });
  return optimizer;
}

/** Identifies the real format from magic bytes; rejects anything not allow-listed. */
export function sniffImage(bytes: Uint8Array): DetectedMedia {
  let detected: DetectedMedia;
  try {
    detected = detectMedia(bytes);
  } catch {
    throw new UnsupportedMediaTypeError("Unsupported file. Upload a JPEG, PNG, WebP, AVIF or GIF image.");
  }
  if (detected.kind !== "image" || !ALLOWED_INPUT_FORMATS.has(detected.format)) {
    throw new UnsupportedMediaTypeError("Unsupported file. Upload a JPEG, PNG, WebP, AVIF or GIF image.");
  }
  return detected;
}

function exceedsBounds(detected: DetectedMedia, purpose: ImagePurpose): boolean {
  const bounds = PURPOSE_BOUNDS[purpose];
  // Unknown dimensions: resize defensively.
  if (!detected.width || !detected.height) return true;
  return detected.width > bounds.width || detected.height > bounds.height;
}

/**
 * Scales oversized images into the purpose's bounds (EXIF orientation applied).
 * Writes a lossless intermediate so quality is only reduced once, by the optimizer.
 */
async function resizeForPurpose(bytes: Uint8Array, detected: DetectedMedia, purpose: ImagePurpose): Promise<Uint8Array> {
  if (!exceedsBounds(detected, purpose)) return bytes;
  const animated = detected.format === "gif" || detected.format === "webp";
  const pipeline = sharp(bytes, { animated, limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ ...PURPOSE_BOUNDS[purpose], fit: "inside", withoutEnlargement: true });
  const output = animated ? pipeline.webp({ lossless: true }) : pipeline.png({ compressionLevel: 1 });
  return new Uint8Array(await output.toBuffer());
}

function toProcessingError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof OptimizerError) {
    if (error.code === 413) return new PayloadTooLargeError("Image dimensions are too large.");
    if (error.code === 415) return new UnsupportedMediaTypeError("Unsupported image format.");
    if (error.code === 503) return new ServiceUnavailableError("IMAGE_QUEUE_FULL", "Image processing is busy. Please retry shortly.");
  }
  logger.warn("Image compression failed", { error });
  return new AppError(422, "IMAGE_PROCESSING_FAILED", "We couldn't process this image. It may be corrupted - try another file.");
}

/**
 * Validate (magic bytes) → resize per purpose → compress with image-video-compressor
 * (format auto, quality 80, metadata stripped). Throws instead of ever returning
 * the unprocessed original.
 */
export async function processImage(input: Uint8Array, purpose: ImagePurpose): Promise<ProcessedImage> {
  if (input.byteLength > MAX_IMAGE_INPUT_BYTES) throw new PayloadTooLargeError("Images must be 4 MB or smaller.");
  const detected = sniffImage(input);

  try {
    const resized = await resizeForPurpose(input, detected, purpose);
    const result = await getOptimizer().optimize(resized, {
      mediaType: "auto",
      imageSettings: { format: "auto", quality: 80 },
    });
    if (!result.success || result.details.mediaType !== "image") throw new Error("Optimizer returned no image.");

    const mimeType = OUTPUT_MIME[result.format];
    if (!mimeType) throw new Error(`Unexpected output format ${result.format}`);
    const ratio = input.byteLength > 0 ? ((1 - result.optimizedSize / input.byteLength) * 100).toFixed(1) : "0.0";
    return {
      bytes: result.data,
      format: result.format,
      mimeType,
      originalSize: input.byteLength,
      size: result.optimizedSize,
      compressionRatio: `${ratio}%`,
      width: result.details.width,
      height: result.details.height,
    };
  } catch (error) {
    throw toProcessingError(error);
  }
}
