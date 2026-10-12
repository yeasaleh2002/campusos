import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { fail } from "@/lib/api-response";
import { logger } from "@/lib/logger";

/**
 * Base class for expected, client-facing errors. Anything that is NOT an
 * AppError is treated as an internal failure and answered with a generic 500.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request.", details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed.", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists.", details?: unknown) {
    super(409, "CONFLICT", message, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "Payload too large.") {
    super(413, "PAYLOAD_TOO_LARGE", message);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = "Content-Type must be application/json.") {
    super(415, "UNSUPPORTED_MEDIA_TYPE", message);
  }
}

/** An upstream provider (e.g. email) failed; the operation is safe to retry. */
export class ServiceUnavailableError extends AppError {
  constructor(code: string, message: string) {
    super(503, code, message);
  }
}

export class RateLimitError extends AppError {
  constructor(
    public readonly retryAfterSeconds: number,
    message = "Too many requests. Please try again later.",
  ) {
    super(429, "RATE_LIMITED", message);
  }
}

/** Converts Zod issues to a client-safe `[{ path, message }]` list. */
function zodIssues(error: ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

/** Maps known Prisma request errors to AppErrors; returns null for anything else. */
function fromPrismaError(error: Prisma.PrismaClientKnownRequestError): AppError | null {
  switch (error.code) {
    case "P2002":
      return new ConflictError("A record with these details already exists.");
    case "P2025":
      return new NotFoundError();
    case "P2003":
      return new BadRequestError("A referenced record does not exist.");
    default:
      return null;
  }
}

/** Normalises any thrown value into an AppError (or null = unexpected). */
function toAppError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) return new ValidationError(undefined, zodIssues(error));
  if (error instanceof SyntaxError) return new BadRequestError("Malformed JSON body.");
  if (error instanceof Prisma.PrismaClientKnownRequestError) return fromPrismaError(error);
  return null;
}

/** Builds the error envelope. Unexpected errors are logged and answered generically. */
export function handleApiError(error: unknown, request: NextRequest, requestId: string): Response {
  const appError = toAppError(error);
  const headers: Record<string, string> = { "x-request-id": requestId };

  if (appError) {
    if (appError instanceof RateLimitError) {
      headers["retry-after"] = String(appError.retryAfterSeconds);
    }
    return fail(appError.status, appError.code, appError.message, appError.details, headers);
  }

  logger.error("Unhandled API error", {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    error,
  });
  return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.", undefined, headers);
}

/** Accept upstream request ids (e.g. from a proxy) only if they look safe to log. */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Wraps a Route Handler with centralised error handling and a request id.
 *
 * @example
 * export const GET = withApiHandler(async (req) => ok(await listEvents(req)));
 */
export function withApiHandler<Context>(
  handler: (request: NextRequest, context: Context) => Promise<Response>,
) {
  return async (request: NextRequest, context: Context): Promise<Response> => {
    const incomingId = request.headers.get("x-request-id");
    const requestId =
      incomingId && REQUEST_ID_PATTERN.test(incomingId) ? incomingId : crypto.randomUUID();
    try {
      const response = await handler(request, context);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      return handleApiError(error, request, requestId);
    }
  };
}
