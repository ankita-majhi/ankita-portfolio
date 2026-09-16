import { createHash, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";

export function ok(data: unknown, status = 200): Response {
  return Response.json({ ok: true, data }, { status });
}

export function fail(error: string, status = 400, details?: unknown): Response {
  return Response.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

/** Best-effort client IP, used only for rate limiting. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function sameSecret(a: string, b: string): boolean {
  // Hashing first gives both buffers equal length, so the comparison itself
  // cannot leak the secret's length.
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

/**
 * Returns null when the request carries the admin secret, or a Response to
 * return as-is when it does not.
 */
export function requireAdmin(request: Request): Response | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return fail("Admin access is not configured. Set ADMIN_TOKEN in your environment.", 503);
  }
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : request.headers.get("x-admin-token") || "";
  if (!token || !sameSecret(token, expected)) {
    return fail("Unauthorized.", 401);
  }
  return null;
}

export function toObjectId(value: string): ObjectId | null {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

/** Wraps a handler so a thrown error becomes a 500 instead of an unhandled rejection. */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api]", message);
    const configIssue = message.includes("MONGODB_URI");
    return fail(
      configIssue ? message : "Something went wrong on the server.",
      configIssue ? 503 : 500
    );
  }
}
