import type { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { SiteContent } from "./defaults";

export type MessageStatus = "new" | "read" | "archived";

export type MessageDoc = {
  _id?: ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: MessageStatus;
  ip: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDoc = {
  _id?: ObjectId;
  slug: string;
  name: string;
  category: string;
  subtitle: string;
  description: string;
  stack: string[];
  features: string[];
  color: string;
  published: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SkillDoc = {
  _id?: ObjectId;
  icon: string;
  title: string;
  category: string;
  text: string;
  items: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

/** The whole site copy lives in one document, under the fixed id "site". */
export type SettingsDoc = Partial<SiteContent> & {
  _id?: string;
  updatedAt?: Date;
};

export const SETTINGS_ID = "site";

// Indexes are created once per server process, on the first query that needs
// them. `createIndex` is idempotent, so repeated calls are safe.
let indexesReady: Promise<void> | undefined;

function ensureIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await Promise.all([
        db.collection<MessageDoc>("messages").createIndex({ createdAt: -1 }),
        db.collection<MessageDoc>("messages").createIndex({ status: 1, createdAt: -1 }),
        // Backs the per-IP rate limit lookup.
        db.collection<MessageDoc>("messages").createIndex({ ip: 1, createdAt: -1 }),
        db.collection<ProjectDoc>("projects").createIndex({ slug: 1 }, { unique: true }),
        db.collection<ProjectDoc>("projects").createIndex({ published: 1, order: 1 }),
        db.collection<SkillDoc>("skills").createIndex({ order: 1 }),
      ]);
    })().catch(error => {
      indexesReady = undefined;
      throw error;
    });
  }
  return indexesReady;
}

export async function messagesCollection(): Promise<Collection<MessageDoc>> {
  const db = await getDb();
  await ensureIndexes();
  return db.collection<MessageDoc>("messages");
}

export async function projectsCollection(): Promise<Collection<ProjectDoc>> {
  const db = await getDb();
  await ensureIndexes();
  return db.collection<ProjectDoc>("projects");
}

export async function skillsCollection(): Promise<Collection<SkillDoc>> {
  const db = await getDb();
  await ensureIndexes();
  return db.collection<SkillDoc>("skills");
}

export async function settingsCollection(): Promise<Collection<SettingsDoc>> {
  const db = await getDb();
  return db.collection<SettingsDoc>("settings");
}
