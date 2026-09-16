import type { Filter } from "mongodb";
import type { NextRequest } from "next/server";
import { projectsCollection, type ProjectDoc } from "@/lib/collections";
import { fail, handle, ok, requireAdmin, toObjectId } from "@/lib/api";
import { validateProject } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ idOrSlug: string }> };

/** Accepts either the MongoDB _id or the human-readable slug. */
function locate(idOrSlug: string): Filter<ProjectDoc> {
  const _id = toObjectId(idOrSlug);
  return _id ? { _id } : { slug: idOrSlug };
}

/** Public: read one published project. Admins also see unpublished ones. */
export async function GET(request: NextRequest, context: Context) {
  return handle(async () => {
    const { idOrSlug } = await context.params;
    const isAdmin = requireAdmin(request) === null;

    const projects = await projectsCollection();
    const filter = locate(idOrSlug);
    const doc = await projects.findOne(isAdmin ? filter : { ...filter, published: true });
    if (!doc) return fail("Project not found.", 404);

    return ok({ ...doc, _id: doc._id!.toString() });
  });
}

/** Admin: update some or all fields of a project. */
export async function PATCH(request: NextRequest, context: Context) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { idOrSlug } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Expected a JSON body.", 400);
    }

    const result = validateProject(body, true);
    if (!result.ok) return fail("Please check the highlighted fields.", 422, result.errors);
    if (!Object.keys(result.value).length) return fail("No known fields to update.", 422);

    const projects = await projectsCollection();
    const existing = await projects.findOne(locate(idOrSlug));
    if (!existing) return fail("Project not found.", 404);

    if (result.value.slug) {
      const clash = await projects.findOne({ slug: result.value.slug });
      if (clash && !clash._id.equals(existing._id!)) {
        return fail(`A project with the slug "${result.value.slug}" already exists.`, 409);
      }
    }

    const updated = await projects.findOneAndUpdate(
      { _id: existing._id },
      { $set: { ...result.value, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) return fail("Project not found.", 404);

    return ok({ ...updated, _id: updated._id!.toString() });
  });
}

/** Admin: replace a project's contents. */
export async function PUT(request: NextRequest, context: Context) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { idOrSlug } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Expected a JSON body.", 400);
    }

    const result = validateProject(body);
    if (!result.ok) return fail("Please check the highlighted fields.", 422, result.errors);

    const projects = await projectsCollection();
    const existing = await projects.findOne(locate(idOrSlug));
    if (!existing) return fail("Project not found.", 404);

    const clash = await projects.findOne({ slug: result.value.slug! });
    if (clash && !clash._id.equals(existing._id!)) {
      return fail(`A project with the slug "${result.value.slug}" already exists.`, 409);
    }

    const updated = await projects.findOneAndUpdate(
      { _id: existing._id },
      { $set: { ...result.value, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    return ok({ ...updated, _id: updated!._id!.toString() });
  });
}

/** Admin: delete a project. */
export async function DELETE(request: NextRequest, context: Context) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { idOrSlug } = await context.params;
    const projects = await projectsCollection();
    const result = await projects.deleteOne(locate(idOrSlug));
    if (!result.deletedCount) return fail("Project not found.", 404);

    return ok({ idOrSlug, deleted: true });
  });
}
