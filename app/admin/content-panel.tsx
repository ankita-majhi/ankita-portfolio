"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Field, IconField, Repeater, Section, Unauthorized, apiFor } from "./ui";
import type { SiteContent } from "@/lib/defaults";

const GROUPS = [
  ["profile", "Profile"],
  ["hero", "Hero"],
  ["focus", "Focus strip"],
  ["work", "Work section"],
  ["about", "About"],
  ["skills", "Toolkit heading"],
  ["journey", "Journey"],
  ["contact", "Contact"],
  ["footer", "Footer"],
] as const;

export default function ContentPanel({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const api = apiFor(token, onUnauthorized);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saved, setSaved] = useState("");
  const [group, setGroup] = useState<string>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/settings");
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Could not load the site content.");
      const { updatedAt, ...rest } = body.data;
      setContent(rest);
      setSaved(JSON.stringify(rest));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not load the site content.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setError("");
    setNote("");
    try {
      const data = await api("/api/settings", { method: "PUT", body: JSON.stringify(content) });
      const { updatedAt, ...rest } = data;
      setContent(rest);
      setSaved(JSON.stringify(rest));
      setNote("Saved. Reload the site to see it.");
    } catch (problem) {
      if (!(problem instanceof Unauthorized)) setError(problem instanceof Error ? problem.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Section title="Site content"><p className="admin-empty admin-loading">Loading…</p></Section>;
  if (!content) return <Section title="Site content"><p className="admin-error">{error || "No content."}</p></Section>;

  const dirty = JSON.stringify(content) !== saved;
  const set = <K extends keyof SiteContent>(key: K, patch: Partial<SiteContent[K]>) =>
    setContent({ ...content, [key]: { ...(content[key] as object), ...patch } } as SiteContent);

  return <Section title="Site content" description="Every piece of text on the homepage. A newline becomes a line break.">
    <div className="agroups">
      {GROUPS.map(([key, label]) => <button key={key} className={group === key ? "active" : ""} onClick={()=>setGroup(key)}>{label}</button>)}
    </div>

    {error && <p className="admin-error" role="alert">{error}</p>}
    {note && !dirty && <p className="anote" role="status">{note}</p>}

    {group === "profile" && <>
      <div className="agrid">
        <Field label="Name" value={content.profile.name} onChange={name => set("profile", { name })} hint="Used in the logo and footer" />
        <Field label="Email" type="email" value={content.profile.email} onChange={email => set("profile", { email })} hint="Leave empty to hide the email button" />
      </div>
      <div className="agrid">
        <Field label="GitHub URL" value={content.profile.github} onChange={github => set("profile", { github })} hint="Empty hides the link" placeholder="https://github.com/…" />
        <Field label="LinkedIn URL" value={content.profile.linkedin} onChange={linkedin => set("profile", { linkedin })} hint="Empty hides the link" placeholder="https://linkedin.com/in/…" />
      </div>
      <Field label="College" value={content.profile.college} onChange={college => set("profile", { college })} hint="When set, replaces the text of the first journey step" />
    </>}

    {group === "hero" && <>
      <Field label="Eyebrow" value={content.hero.eyebrow} onChange={eyebrow => set("hero", { eyebrow })} />
      <div className="agrid">
        <Field label="Headline" value={content.hero.headline} onChange={headline => set("hero", { headline })} rows={2} hint="One line per row" />
        <Field label="Headline accent" value={content.hero.headlineAccent} onChange={headlineAccent => set("hero", { headlineAccent })} hint="The highlighted last line" />
      </div>
      <Field label="Intro paragraph" value={content.hero.intro} onChange={intro => set("hero", { intro })} rows={3} />
      <div className="agrid">
        <Field label="Primary button" value={content.hero.primaryCta} onChange={primaryCta => set("hero", { primaryCta })} />
        <Field label="Secondary button" value={content.hero.secondaryCta} onChange={secondaryCta => set("hero", { secondaryCta })} />
      </div>
      <Field label="Footnote" value={content.hero.foot} onChange={foot => set("hero", { foot })} hint="Next to the graduation icon" />
    </>}

    {group === "focus" && <Repeater
      label="Focus strip"
      items={content.focus}
      onChange={focus => setContent({ ...content, focus })}
      blank={() => ({ icon: "code", text: "" })}
      addLabel="Add item"
      render={(item, update) => <div className="agrid">
        <IconField label="Icon" value={item.icon} onChange={icon => update({ icon })} />
        <Field label="Text" value={item.text} onChange={text => update({ text })} />
      </div>}
    />}

    {group === "work" && <>
      <Field label="Section label" value={content.work.label} onChange={label => set("work", { label })} />
      <div className="agrid">
        <Field label="Heading" value={content.work.heading} onChange={heading => set("work", { heading })} />
        <Field label="Heading accent" value={content.work.headingAccent} onChange={headingAccent => set("work", { headingAccent })} hint="Shown in the serif face" />
      </div>
      <Field label="Intro" value={content.work.intro} onChange={intro => set("work", { intro })} rows={2} />
      <Field label="Closing note" value={content.work.note} onChange={note => set("work", { note })} rows={2} hint="Empty hides it" />
    </>}

    {group === "about" && <>
      <Field label="Section label" value={content.about.label} onChange={label => set("about", { label })} />
      <div className="agrid">
        <Field label="Heading" value={content.about.heading} onChange={heading => set("about", { heading })} />
        <Field label="Heading accent" value={content.about.headingAccent} onChange={headingAccent => set("about", { headingAccent })} />
      </div>
      <Field
        label="Paragraphs"
        hint="Separate paragraphs with a blank line. *Text in asterisks* renders in italics."
        rows={8}
        value={content.about.paragraphs.join("\n\n")}
        onChange={value => set("about", { paragraphs: value.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean) })}
      />
      <Field label="Working style label" value={content.about.workingLabel} onChange={workingLabel => set("about", { workingLabel })} />
      <Repeater
        label="How I approach a project"
        items={content.about.steps}
        onChange={steps => set("about", { steps })}
        blank={() => ({ number: "", title: "", text: "" })}
        addLabel="Add step"
        render={(step, update) => <>
          <div className="agrid">
            <Field label="Number" value={step.number} onChange={number => update({ number })} placeholder="01" />
            <Field label="Title" value={step.title} onChange={title => update({ title })} />
          </div>
          <Field label="Text" value={step.text} onChange={text => update({ text })} rows={2} />
        </>}
      />
      <Repeater
        label="Small notes"
        items={content.about.notes}
        onChange={notes => set("about", { notes })}
        blank={() => ({ icon: "sparkles", text: "" })}
        addLabel="Add note"
        render={(item, update) => <div className="agrid">
          <IconField label="Icon" value={item.icon} onChange={icon => update({ icon })} />
          <Field label="Text" value={item.text} onChange={text => update({ text })} />
        </div>}
      />
    </>}

    {group === "skills" && <>
      <Field label="Section label" value={content.skills.label} onChange={label => set("skills", { label })} />
      <div className="agrid">
        <Field label="Heading" value={content.skills.heading} onChange={heading => set("skills", { heading })} />
        <Field label="Heading accent" value={content.skills.headingAccent} onChange={headingAccent => set("skills", { headingAccent })} />
      </div>
      <Field label="Intro" value={content.skills.intro} onChange={intro => set("skills", { intro })} rows={2} />
      <Field label="Closing note" value={content.skills.note} onChange={note => set("skills", { note })} hint="Empty hides it" />
      <p className="ahint">The cards themselves live under the Skills tab.</p>
    </>}

    {group === "journey" && <>
      <Field label="Section label" value={content.journey.label} onChange={label => set("journey", { label })} />
      <div className="agrid">
        <Field label="Heading" value={content.journey.heading} onChange={heading => set("journey", { heading })} />
        <Field label="Heading accent" value={content.journey.headingAccent} onChange={headingAccent => set("journey", { headingAccent })} />
      </div>
      <Field label="Intro" value={content.journey.intro} onChange={intro => set("journey", { intro })} rows={2} />
      <Repeater
        label="Timeline"
        items={content.journey.steps}
        onChange={steps => set("journey", { steps })}
        blank={() => ({ label: "", title: "", text: "", badge: "" })}
        addLabel="Add step"
        render={(step, update) => <>
          <div className="agrid">
            <Field label="Label" value={step.label} onChange={label => update({ label })} placeholder="01 / THE FOUNDATION" />
            <Field label="Badge" value={step.badge} onChange={badge => update({ badge })} hint="Optional, e.g. CURRENT CHAPTER" />
          </div>
          <Field label="Title" value={step.title} onChange={title => update({ title })} />
          <Field label="Text" value={step.text} onChange={text => update({ text })} rows={3} />
        </>}
      />
    </>}

    {group === "contact" && <>
      <Field label="Section label" value={content.contact.label} onChange={label => set("contact", { label })} />
      <div className="agrid">
        <Field label="Heading" value={content.contact.heading} onChange={heading => set("contact", { heading })} />
        <Field label="Heading accent" value={content.contact.headingAccent} onChange={headingAccent => set("contact", { headingAccent })} />
      </div>
      <Field label="Intro" value={content.contact.intro} onChange={intro => set("contact", { intro })} rows={2} />
      <div className="agrid">
        <Field label="Form heading" value={content.contact.formHeading} onChange={formHeading => set("contact", { formHeading })} />
        <Field label="Form intro" value={content.contact.formIntro} onChange={formIntro => set("contact", { formIntro })} rows={2} />
      </div>
    </>}

    {group === "footer" && <Field label="Footer note" value={content.footer.note} onChange={note => set("footer", { note })} hint="Follows the copyright line" />}

    <div className="asave">
      <span>{dirty ? "Unsaved changes" : note || "All changes saved"}</span>
      <div>
        <button className="admin-btn" onClick={load} disabled={saving || !dirty}><RotateCcw size={15}/> Discard</button>
        <button className="button primary" onClick={save} disabled={saving || !dirty}><Save size={16}/> {saving ? "Saving…" : "Save changes"}</button>
      </div>
    </div>
  </Section>;
}
