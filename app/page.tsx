import { getSiteData } from "@/lib/content";
import Home from "./home";

// Content is edited from /admin, so the page is rendered per request rather
// than cached: a save is visible on the next reload.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { content, projects, skills } = await getSiteData();
  return <Home content={content} projects={projects} skills={skills} />;
}
