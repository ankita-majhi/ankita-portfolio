import type { NextRequest } from "next/server";
import { skillsCollection } from "@/lib/collections";
import { fail, handle, ok, requireAdmin, toObjectId } from "@/lib/api";
import { validateSkill } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Admin: update a skill card. */
export async function PATCH(request: NextRequest, context: Context) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { id } = await context.params;
    const _id = toObjectId(id);
    if (!_id) return fail("Invalid skill id.", 400);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Expected a JSON body.", 400);
    }

    const result = validateSkill(body, true);
    if (!result.ok) return fail("Please check the highlighted fields.", 422, result.errors);
    if (!Object.keys(result.value).length) return fail("No known fields to update.", 422);

    const skills = await skillsCollection();
    const updated = await skills.findOneAndUpdate(
      { _id },
      { $set: { ...result.value, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) return fail("Skill not found.", 404);

    return ok({ ...updated, _id: updated._id!.toString() });
  });
}

/** Admin: delete a skill card. */
export async function DELETE(request: NextRequest, context: Context) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { id } = await context.params;
    const _id = toObjectId(id);
    if (!_id) return fail("Invalid skill id.", 400);

    const skills = await skillsCollection();
    const result = await skills.deleteOne({ _id });
    if (!result.deletedCount) return fail("Skill not found.", 404);

    return ok({ id, deleted: true });
  });
}
