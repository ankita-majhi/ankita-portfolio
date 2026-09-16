import { getDb } from "@/lib/mongodb";
import { fail, handle, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const started = Date.now();
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      return ok({ database: "connected", name: db.databaseName, latencyMs: Date.now() - started });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Database unreachable.", 503);
    }
  });
}
