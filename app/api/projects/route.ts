import type { NextRequest } from "next/server";
import { projectsCollection, type ProjectDoc } from "@/lib/collections";
import { fail, handle, ok, requireAdmin } from "@/lib/api";
import { validateProject } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** Public: list published projects. Admins can pass ?includeUnpublished=1. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const wantsAll = params.get("includeUnpublished") === "1";
    const isAdmin = wantsAll && requireAdmin(request) === null;
    const category = params.get("category");

    const filter: Record<string, unknown> = isAdmin ? {} : { published: true };
    if (category && category !== "All work") filter.category = category;

    const projects = await projectsCollection();
    const items = await projects.find(filter).sort({ order: 1, createdAt: 1 }).toArray();

    return ok({
      items: items.map(item => ({ ...item, _id: item._id!.toString() })),
      total: items.length,
    });
  });
}

/** Admin: create a project. */
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

    const result = validateProject(body);
    if (!result.ok) return fail("Please check the highlighted fields.", 422, result.errors);

    const projects = await projectsCollection();
    if (await projects.findOne({ slug: result.value.slug })) {
      return fail(`A project with the slug "${result.value.slug}" already exists.`, 409);
    }

    const now = new Date();
    const doc = { ...result.value, createdAt: now, updatedAt: now } as ProjectDoc;
    const inserted = await projects.insertOne(doc);

    return ok({ ...doc, _id: inserted.insertedId.toString() }, 201);
  });
}
