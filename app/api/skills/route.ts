import type { NextRequest } from "next/server";
import { skillsCollection, type SkillDoc } from "@/lib/collections";
import { fail, handle, ok, requireAdmin } from "@/lib/api";
import { validateSkill } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** Public: the skill cards, in display order. */
export async function GET() {
  return handle(async () => {
    const skills = await skillsCollection();
    const items = await skills.find({}).sort({ order: 1 }).toArray();
    return ok({ items: items.map(item => ({ ...item, _id: item._id!.toString() })), total: items.length });
  });
}

/** Admin: add a skill card. */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Expected a JSON body.", 400);
    }

    const result = validateSkill(body);
    if (!result.ok) return fail("Please check the highlighted fields.", 422, result.errors);

    const skills = await skillsCollection();
    const now = new Date();
    const doc = { ...result.value, createdAt: now, updatedAt: now } as SkillDoc;
    const inserted = await skills.insertOne(doc);

    return ok({ ...doc, _id: inserted.insertedId.toString() }, 201);
  });
}
