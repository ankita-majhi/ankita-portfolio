import type { NextRequest } from "next/server";
import { settingsCollection, SETTINGS_ID } from "@/lib/collections";
import { fail, handle, ok, requireAdmin } from "@/lib/api";
import { validateSettings } from "@/lib/validate";
import { defaultContent } from "@/lib/defaults";

export const dynamic = "force-dynamic";

/** Public: the site copy, with anything unset falling back to the shipped text. */
export async function GET() {
  return handle(async () => {
    const settings = await settingsCollection();
    const stored = await settings.findOne({ _id: SETTINGS_ID });
    const { _id, updatedAt, ...saved } = stored || ({} as any);
    return ok({ ...defaultContent, ...saved, updatedAt: updatedAt || null });
  });
}

/** Admin: update one or more sections. Sections left out keep their values. */
export async function PUT(request: NextRequest) {
  return handle(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Expected a JSON body.", 400);
    }

    const result = validateSettings(body);
    if (!result.ok) return fail("Please check the highlighted fields.", 422, result.errors);

    const settings = await settingsCollection();
    await settings.updateOne(
      { _id: SETTINGS_ID },
      { $set: { ...result.value, updatedAt: new Date() } },
      { upsert: true }
    );

    const saved = await settings.findOne({ _id: SETTINGS_ID });
    const { _id, ...rest } = saved || ({} as any);
    return ok({ ...defaultContent, ...rest });
  });
}
