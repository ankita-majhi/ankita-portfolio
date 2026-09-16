import type { NextRequest } from "next/server";
import { messagesCollection, type MessageStatus } from "@/lib/collections";
import { fail, handle, ok, requireAdmin, toObjectId } from "@/lib/api";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const STATUSES: MessageStatus[] = ["new", "read", "archived"];

/** Admin: read one message. */
export async function GET(request: NextRequest, context: Context) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { id } = await context.params;
    const _id = toObjectId(id);
    if (!_id) return fail("Invalid message id.", 400);

    const messages = await messagesCollection();
    const doc = await messages.findOne({ _id });
    if (!doc) return fail("Message not found.", 404);

    return ok({ ...doc, _id: doc._id!.toString() });
  });
}

/** Admin: change a message's status. */
export async function PATCH(request: NextRequest, context: Context) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { id } = await context.params;
    const _id = toObjectId(id);
    if (!_id) return fail("Invalid message id.", 400);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return fail("Expected a JSON body.", 400);
    }

    const status = body?.status;
    if (!STATUSES.includes(status)) {
      return fail(`Status must be one of: ${STATUSES.join(", ")}.`, 422);
    }

    const messages = await messagesCollection();
    const updated = await messages.findOneAndUpdate(
      { _id },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) return fail("Message not found.", 404);

    return ok({ ...updated, _id: updated._id!.toString() });
  });
}

/** Admin: delete a message for good. */
export async function DELETE(request: NextRequest, context: Context) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { id } = await context.params;
    const _id = toObjectId(id);
    if (!_id) return fail("Invalid message id.", 400);

    const messages = await messagesCollection();
    const result = await messages.deleteOne({ _id });
    if (!result.deletedCount) return fail("Message not found.", 404);

    return ok({ id, deleted: true });
  });
}
