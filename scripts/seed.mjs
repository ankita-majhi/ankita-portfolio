/**
 * Seeds projects, skill cards and the site copy from app/data.ts and
 * lib/defaults.ts, and creates the indexes.
 *
 * Safe to re-run: projects match on slug, skills on title, and site copy is
 * left alone once written so your /admin edits survive. Pass --reset-content
 * to put the shipped text back.
 *
 *   node --env-file=.env.local scripts/seed.mjs
 */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}
const dbName = process.env.MONGODB_DB || "ankita_portfolio";

// Node strips the types from these files on import (Node 22.18+ / 24+), so the
// seed stays in sync with the site's own defaults.
async function readDefaults() {
  try {
    const [data, defaults] = await Promise.all([
      import("../app/data.ts"),
      import("../lib/defaults.ts"),
    ]);
    return { projects: data.projects, content: defaults.defaultContent, skills: defaults.defaultSkills };
  } catch (error) {
    throw new Error(
      "Could not read the default content. Node 22.18 or newer is required to import TypeScript directly. " + error.message
    );
  }
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

try {
  await client.connect();
  const db = client.db(dbName);
  const projects = db.collection("projects");

  await projects.createIndex({ slug: 1 }, { unique: true });
  await projects.createIndex({ published: 1, order: 1 });
  await db.collection("messages").createIndex({ createdAt: -1 });
  await db.collection("messages").createIndex({ status: 1, createdAt: -1 });
  await db.collection("messages").createIndex({ ip: 1, createdAt: -1 });

  await db.collection("skills").createIndex({ order: 1 });

  const now = new Date();
  const defaults = await readDefaults();
  let created = 0;
  let updated = 0;

  for (const [index, project] of defaults.projects.entries()) {
    const { id, ...rest } = project;
    const result = await projects.updateOne(
      { slug: id },
      {
        $set: { ...rest, slug: id, published: true, order: index, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    if (result.upsertedCount) created++;
    else if (result.modifiedCount) updated++;
  }

  // Skill cards are matched on their title so re-running never duplicates them.
  const skills = db.collection("skills");
  let skillsCreated = 0;
  for (const [index, skill] of defaults.skills.entries()) {
    const result = await skills.updateOne(
      { title: skill.title },
      { $set: { ...skill, order: index, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    if (result.upsertedCount) skillsCreated++;
  }

  // Site copy is written once. A re-run leaves edits made in /admin alone;
  // pass --reset-content to put the shipped text back.
  const settings = db.collection("settings");
  const existing = await settings.findOne({ _id: "site" });
  const resetContent = process.argv.includes("--reset-content");
  let contentAction = "kept your edits";
  if (!existing || resetContent) {
    await settings.updateOne(
      { _id: "site" },
      { $set: { ...defaults.content, updatedAt: now } },
      { upsert: true }
    );
    contentAction = existing ? "reset to the shipped text" : "written";
  }

  console.log(`Seeded "${dbName}":`);
  console.log(`  projects: ${created} created, ${updated} updated`);
  console.log(`  skills:   ${skillsCreated} created, ${defaults.skills.length - skillsCreated} already there`);
  console.log(`  content:  ${contentAction}`);
  console.log("  indexes:  ready");
} catch (error) {
  console.error("Seed failed:", error.message);
  console.error(explain(error, uri));
  process.exitCode = 1;
} finally {
  await client.close();
}

/** Turns the driver's terse connection errors into the actual next step. */
function explain(error, uri) {
  const text = `${error.name}: ${error.message}`;
  const atlas = uri.startsWith("mongodb+srv://");

  if (/ECONNREFUSED/.test(text)) {
    return atlas
      ? "\nThe cluster refused the connection. Check the cluster is not paused in the Atlas dashboard."
      : "\nNothing is listening at that address, so no MongoDB is running there.\n" +
        "Either start a local MongoDB, or put a MongoDB Atlas connection string in .env.local:\n" +
        "  MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority";
  }
  if (/Authentication failed|bad auth/i.test(text)) {
    return "\nThe cluster was reached but rejected the credentials.\n" +
      "Check the database user and password in your connection string. A password containing\n" +
      "@ : / ? # [ ] must be percent-encoded — encodeURIComponent(password) gives the right form.";
  }
  if (/ENOTFOUND|querySrv|getaddrinfo/i.test(text)) {
    return "\nThat hostname could not be resolved. Check the cluster address is copied exactly,\n" +
      "and that you are online.";
  }
  if (/timed out|ServerSelectionTimeout/i.test(text)) {
    return atlas
      ? "\nThe cluster did not answer in time. This is almost always the Atlas IP allowlist:\n" +
        "open Network Access in the Atlas dashboard and add your current IP address."
      : "\nThe server did not answer in time. Check MongoDB is running and reachable.";
  }
  return "";
}
