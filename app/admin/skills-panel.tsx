"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Field, IconField, ListField, Section, Unauthorized, apiFor } from "./ui";
import { Icon } from "../content-bits";

type Skill = { _id: string; icon: string; title: string; category: string; text: string; items: string[]; order: number };

function blank(order: number): Skill {
  return { _id: "", icon: "code", title: "", category: "", text: "", items: [], order };
}

export default function SkillsPanel({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const api = apiFor(token, onUnauthorized);
  const [items, setItems] = useState<Skill[]>([]);
  const [draft, setDraft] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/skills");
      setItems(data.items);
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not load skills.");
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
      if (draft._id) await api(`/api/skills/${draft._id}`, { method: "PATCH", body });
      else await api("/api/skills", { method: "POST", body });
      setDraft(null);
      await load();
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function reorder(index: number, by: number) {
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    const a = items[index], b = items[target];
    try {
      await Promise.all([
        api(`/api/skills/${a._id}`, { method: "PATCH", body: JSON.stringify({ order: b.order }) }),
        api(`/api/skills/${b._id}`, { method: "PATCH", body: JSON.stringify({ order: a.order }) }),
      ]);
      await load();
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not reorder.");
    }
  }

  async function remove(skill: Skill) {
    if (!window.confirm(`Delete the "${skill.title}" card?`)) return;
    try {
      await api(`/api/skills/${skill._id}`, { method: "DELETE" });
      await load();
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not delete.");
    }
  }

  if (draft) {
    const set = (patch: Partial<Skill>) => setDraft({ ...draft, ...patch });
    return <Section title={draft._id ? `Editing ${draft.title || "card"}` : "New skill card"}>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="agrid">
        <Field label="Title" value={draft.title} onChange={title => set({ title })} placeholder="Frontend development" />
        <Field label="Category" value={draft.category} onChange={category => set({ category })} hint="Shown in uppercase" placeholder="FRONTEND" />
      </div>
      <Field label="One-line description" value={draft.text} onChange={text => set({ text })} rows={2} placeholder="Turning an idea into an interface that feels right." />
      <div className="agrid">
        <IconField label="Icon" value={draft.icon} onChange={icon => set({ icon })} />
        <ListField label="Tags" value={draft.items} onChange={items => set({ items })} hint="One per line, e.g. React" />
      </div>
      <div className="aactions">
        <button className="button primary" onClick={save} disabled={saving || !draft.title.trim()}><Save size={16}/> {saving ? "Saving…" : "Save card"}</button>
        <button className="admin-btn" onClick={()=>setDraft(null)}><X size={15}/> Cancel</button>
      </div>
    </Section>;
  }

  return <Section title="Skill cards" description="The cards in the Toolkit section.">
    <div className="aactions">
      <button className="button primary" onClick={()=>setDraft(blank(items.length))}><Plus size={16}/> Add card</button>
      <button className="admin-btn" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh</button>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading && !items.length && <p className="admin-empty admin-loading">Loading…</p>}
    {!loading && !items.length && <p className="admin-empty">No cards yet.</p>}
    <ul className="arows">
      {items.map((skill, index) => <li key={skill._id} className="arow">
        <div className="arow-main">
          <h4><Icon name={skill.icon} size={17} /> {skill.title}</h4>
          <p>{skill.items.join(" · ")}</p>
        </div>
        <div className="arow-actions">
          <button className="admin-btn" onClick={()=>reorder(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
          <button className="admin-btn" onClick={()=>reorder(index, 1)} disabled={index === items.length - 1} aria-label="Move down">↓</button>
          <button className="admin-btn" onClick={()=>setDraft(skill)}>Edit</button>
          <button className="admin-btn danger" onClick={()=>remove(skill)} aria-label="Delete"><Trash2 size={15}/></button>
        </div>
      </li>)}
    </ul>
  </Section>;
}
