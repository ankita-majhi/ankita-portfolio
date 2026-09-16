import { projectsCollection, settingsCollection, skillsCollection, SETTINGS_ID } from "./collections";
import { defaultContent, defaultSkills, type SiteContent } from "./defaults";
import { projects as fallbackProjects } from "../app/data";

export type PublicProject = {
  id: string;
  name: string;
  category: string;
  subtitle: string;
  description: string;
  stack: string[];
  features: string[];
  color: string;
};

export type PublicSkill = { icon: string; title: string; category: string; text: string; items: string[] };

/**
 * Overlays stored values on the defaults, one section at a time, so a settings
 * document written before a new field existed still renders that new field.
 */
function merge(stored: Partial<SiteContent> | null): SiteContent {
  if (!stored) return defaultContent;
  const out = { ...defaultContent };
  for (const key of Object.keys(defaultContent) as (keyof SiteContent)[]) {
    const section = stored[key];
    if (!section || typeof section !== "object") continue;
    // A section that is a list (the focus strip) is replaced outright. Spreading
    // it into the default would turn the array into a plain object and the
    // section would silently stop rendering.
    if (Array.isArray(defaultContent[key])) {
      if (Array.isArray(section)) out[key] = section as any;
    } else {
      out[key] = { ...defaultContent[key], ...section } as any;
    }
  }
  return out;
}

/**
 * The homepage reads everything through here. Each part falls back to the
 * shipped defaults, so a missing or unreachable database shows the site as it
 * was written rather than an error page.
 */
export async function getSiteData(): Promise<{ content: SiteContent; projects: PublicProject[]; skills: PublicSkill[]; live: boolean }> {
  try {
    const [settings, projects, skills] = await Promise.all([
      settingsCollection().then(c => c.findOne({ _id: SETTINGS_ID })),
      projectsCollection().then(c => c.find({ published: true }).sort({ order: 1, createdAt: 1 }).toArray()),
      skillsCollection().then(c => c.find({}).sort({ order: 1 }).toArray()),
    ]);

    return {
      content: merge(settings),
      projects: projects.length
        ? projects.map(p => ({
            id: p.slug,
            name: p.name,
            category: p.category,
            subtitle: p.subtitle || "",
            description: p.description,
            stack: p.stack || [],
            features: p.features || [],
            color: p.color || "lavender",
          }))
        : fallbackProjects,
      skills: skills.length
        ? skills.map(s => ({ icon: s.icon, title: s.title, category: s.category, text: s.text, items: s.items || [] }))
        : defaultSkills,
      live: true,
    };
  } catch (error) {
    console.error("[content] falling back to defaults:", error instanceof Error ? error.message : error);
    return { content: defaultContent, projects: fallbackProjects, skills: defaultSkills, live: false };
  }
}
