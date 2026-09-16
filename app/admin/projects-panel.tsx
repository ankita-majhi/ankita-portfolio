"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Field, ListField, Section, Unauthorized, apiFor } from "./ui";

type Project = {
  _id: string;
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
};

const COLORS = ["lavender", "peach", "mint"];

// Only these three have hand-drawn previews on the homepage; anything else
// falls back to the Learn Space layout.
const PREVIEW_SLUGS = ["campus", "expense", "learn"];

function blank(order: number): Project {
  return { _id: "", slug: "", name: "", category: "Web apps", subtitle: "", description: "", stack: [], features: [], color: "lavender", published: true, order };
}

export default function ProjectsPanel({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const api = apiFor(token, onUnauthorized);
  const [items, setItems] = useState<Project[]>([]);
  const [draft, setDraft] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/projects?includeUnpublished=1");
      setItems(data.items);
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const body = JSON.stringify(draft);
      if (draft._id) await api(`/api/projects/${draft._id}`, { method: "PUT", body });
      else await api("/api/projects", { method: "POST", body });
      setDraft(null);
      setNote(draft._id ? "Project updated." : "Project added.");
      await load();
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(project: Project) {
    setError("");
    try {
      await api(`/api/projects/${project._id}`, { method: "PATCH", body: JSON.stringify({ published: !project.published }) });
      await load();
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not update.");
    }
  }

  async function reorder(index: number, by: number) {
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    const a = items[index], b = items[target];
    setError("");
    try {
      await Promise.all([
        api(`/api/projects/${a._id}`, { method: "PATCH", body: JSON.stringify({ order: b.order }) }),
        api(`/api/projects/${b._id}`, { method: "PATCH", body: JSON.stringify({ order: a.order }) }),
      ]);
      await load();
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not reorder.");
    }
  }

  async function remove(project: Project) {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await api(`/api/projects/${project._id}`, { method: "DELETE" });
      setNote("Project deleted.");
      await load();
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not delete.");
    }
  }

  if (draft) {
    const set = (patch: Partial<Project>) => setDraft({ ...draft, ...patch });
    return <Section title={draft._id ? `Editing ${draft.name || "project"}` : "New project"}>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="agrid">
        <Field label="Name" value={draft.name} onChange={name => set({ name })} placeholder="Campus Connect" />
        <Field label="Category" value={draft.category} onChange={category => set({ category })} hint="Becomes a filter button" placeholder="Full stack" />
      </div>
      <Field label="Subtitle" value={draft.subtitle} onChange={subtitle => set({ subtitle })} placeholder="A more connected campus." />
      <Field label="Description" value={draft.description} onChange={description => set({ description })} rows={3} placeholder="What the project explores." />
      <div className="agrid">
        <ListField label="Tech stack" value={draft.stack} onChange={stack => set({ stack })} />
        <ListField label="Features" value={draft.features} onChange={features => set({ features })} hint="Shown in the project dialog" />
      </div>
      <div className="agrid">
        <label className="af"><span>Card colour</span>
          <select value={draft.color} onChange={event => set({ color: event.target.value })}>
            {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
          </select>
        </label>
        <label className="af"><span>Visible on the site</span>
          <select value={draft.published ? "yes" : "no"} onChange={event => set({ published: event.target.value === "yes" })}>
            <option value="yes">Published</option>
            <option value="no">Draft — hidden</option>
          </select>
        </label>
      </div>
      {draft._id && <Field label="Slug" value={draft.slug} onChange={slug => set({ slug })} hint="Used in the URL and to pick the preview artwork" />}
      {!PREVIEW_SLUGS.includes(draft.slug) && <p className="ahint">Preview artwork exists for the slugs {PREVIEW_SLUGS.join(", ")}. Any other slug falls back to the Learn Space layout.</p>}
      <div className="aactions">
        <button className="button primary" onClick={save} disabled={saving || !draft.name.trim()}><Save size={16}/> {saving ? "Saving…" : "Save project"}</button>
        <button className="admin-btn" onClick={()=>setDraft(null)}><X size={15}/> Cancel</button>
      </div>
    </Section>;
  }

  return <Section title="Projects" description="These are the cards in the Selected work section.">
    <div className="aactions">
      <button className="button primary" onClick={()=>setDraft(blank(items.length))}><Plus size={16}/> Add project</button>
      <button className="admin-btn" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh</button>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {note && <p className="anote" role="status">{note}</p>}
    {loading && !items.length && <p className="admin-empty admin-loading">Loading…</p>}
    {!loading && !items.length && <p className="admin-empty">No projects yet. Add your first one.</p>}
    <ul className="arows">
      {items.map((project, index) => <li key={project._id} className={project.published ? "arow" : "arow muted"}>
        <div className="arow-main">
          <h4>{project.name} {!project.published && <em>draft</em>}</h4>
          <p>{project.category}{project.subtitle ? ` · ${project.subtitle}` : ""}</p>
        </div>
        <div className="arow-actions">
          <button className="admin-btn" onClick={()=>reorder(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
          <button className="admin-btn" onClick={()=>reorder(index, 1)} disabled={index === items.length - 1} aria-label="Move down">↓</button>
          <button className="admin-btn" onClick={()=>togglePublished(project)}>{project.published ? <><EyeOff size={15}/> Hide</> : <><Eye size={15}/> Publish</>}</button>
          <button className="admin-btn" onClick={()=>setDraft(project)}>Edit</button>
          <button className="admin-btn danger" onClick={()=>remove(project)} aria-label="Delete"><Trash2 size={15}/></button>
        </div>
      </li>)}
    </ul>
  </Section>;
}
