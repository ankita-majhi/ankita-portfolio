import type { NextRequest } from "next/server";
import { messagesCollection, type MessageDoc, type MessageStatus } from "@/lib/collections";
import { clientIp, fail, handle, ok, requireAdmin } from "@/lib/api";
import { validateContact } from "@/lib/validate";

export const dynamic = "force-dynamic";

const STATUSES: MessageStatus[] = ["new", "read", "archived"];

/** Public: store a message from the contact form. */
export async function POST(request: NextRequest) {
  return handle(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Expected a JSON body.", 400);
    }

    const result = validateContact(body);
    if (!result.ok) return fail("Please check the highlighted fields.", 422, result.errors);

    const messages = await messagesCollection();
    const ip = clientIp(request);

    const limit = Number(process.env.CONTACT_RATE_LIMIT || 5);
    if (limit > 0 && ip !== "unknown") {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await messages.countDocuments({ ip, createdAt: { $gt: since } });
      if (recent >= limit) {
        return fail("You have sent several messages recently. Please try again later.", 429);
      }
    }

    const now = new Date();
    const doc: MessageDoc = {
      ...result.value,
      status: "new",
      ip,
      userAgent: (request.headers.get("user-agent") || "").slice(0, 300),
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await messages.insertOne(doc);

    return ok({ id: inserted.insertedId.toString(), createdAt: now }, 201);
  });
}

/** Admin: list stored messages, newest first. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
    const skip = Math.max(Number(params.get("skip")) || 0, 0);

    const filter: Record<string, unknown> = {};
    if (status && STATUSES.includes(status as MessageStatus)) filter.status = status;

    const messages = await messagesCollection();
    const [items, total, unread] = await Promise.all([
      messages.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      messages.countDocuments(filter),
      messages.countDocuments({ status: "new" }),
    ]);

    return ok({
      items: items.map(item => ({ ...item, _id: item._id!.toString() })),
      total,
      unread,
      limit,
      skip,
    });
  });
}
