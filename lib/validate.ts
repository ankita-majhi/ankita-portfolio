/**
 * One shape rather than a discriminated union: this project compiles with
 * `strict: false`, where union narrowing on `ok` is unreliable.
 */
export type Validated<T> = { ok: boolean; value?: T; errors?: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Trims, collapses runs of whitespace, and strips control characters. */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
}

export type ContactInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function validateContact(body: any): Validated<ContactInput> {
  const errors: Record<string, string> = {};

  // Honeypot: real visitors never see this field, so anything in it is a bot.
  if (clean(body?.company)) {
    errors.company = "Rejected.";
  }

  const name = clean(body?.name);
  if (name.length < 2) errors.name = "Please enter your name (at least 2 characters).";
  else if (name.length > 100) errors.name = "Name must be 100 characters or fewer.";

  const email = clean(body?.email).toLowerCase();
  if (!email) errors.email = "Please enter your email address.";
  else if (email.length > 200 || !EMAIL.test(email)) errors.email = "Please enter a valid email address.";

  const message = clean(body?.message);
  if (message.length < 10) errors.message = "Please write at least 10 characters.";
  else if (message.length > 3000) errors.message = "Message must be 3000 characters or fewer.";

  const subject = clean(body?.subject).slice(0, 150);

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, email, subject, message } };
}

export type ProjectInput = {
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

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(clean).filter(Boolean).slice(0, max);
}

export function slugify(value: string): string {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/**
 * `partial` validates an update: only the supplied fields are checked and
 * returned, so a PATCH does not have to resend the whole project.
 */
export function validateProject(body: any, partial = false): Validated<Partial<ProjectInput>> {
  const errors: Record<string, string> = {};
  const value: Partial<ProjectInput> = {};
  const has = (key: string) => body != null && body[key] !== undefined;

  if (!partial || has("name")) {
    const name = clean(body?.name);
    if (name.length < 2 || name.length > 120) errors.name = "Name must be between 2 and 120 characters.";
    else value.name = name;
  }

  if (!partial || has("slug") || has("name")) {
    const slug = slugify(body?.slug || body?.name || "");
    if (!slug) errors.slug = "Slug must contain at least one letter or number.";
    else value.slug = slug;
  }

  if (!partial || has("category")) {
    const category = clean(body?.category);
    if (!category) errors.category = "Category is required.";
    else value.category = category.slice(0, 60);
  }

  if (!partial || has("description")) {
    const description = clean(body?.description);
    if (description.length < 10) errors.description = "Description must be at least 10 characters.";
    else value.description = description.slice(0, 2000);
  }

  if (!partial || has("subtitle")) value.subtitle = clean(body?.subtitle).slice(0, 200);
  if (!partial || has("color")) value.color = clean(body?.color).slice(0, 40) || "lavender";
  if (!partial || has("stack")) value.stack = stringList(body?.stack, 20);
  if (!partial || has("features")) value.features = stringList(body?.features, 20);
  if (!partial || has("published")) value.published = body?.published !== false;

  if (!partial || has("order")) {
    const order = Number(body?.order);
    value.order = Number.isFinite(order) ? order : 0;
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value };
}

/** Trimmed text, capped, with newlines preserved (headings and intros use them). */
function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
}

export type SkillInput = { icon: string; title: string; category: string; text: string; items: string[]; order: number };

export function validateSkill(body: any, partial = false): Validated<Partial<SkillInput>> {
  const errors: Record<string, string> = {};
  const value: Partial<SkillInput> = {};
  const has = (key: string) => body != null && body[key] !== undefined;

  if (!partial || has("title")) {
    const title = text(body?.title, 120);
    if (title.length < 2) errors.title = "Title must be at least 2 characters.";
    else value.title = title;
  }
  if (!partial || has("text")) {
    const blurb = text(body?.text, 400);
    if (!blurb) errors.text = "Write a short line describing this group.";
    else value.text = blurb;
  }
  if (!partial || has("category")) value.category = text(body?.category, 60);
  if (!partial || has("icon")) value.icon = text(body?.icon, 40) || "code";
  if (!partial || has("items")) value.items = stringList(body?.items, 20);
  if (!partial || has("order")) {
    const order = Number(body?.order);
    value.order = Number.isFinite(order) ? order : 0;
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value };
}

/**
 * Site copy. Every field is optional and only the recognised ones are kept, so
 * a stray key from a hand-written request can never land in the document.
 */
export function validateSettings(body: any): Validated<Record<string, any>> {
  if (!body || typeof body !== "object") return { ok: false, errors: { body: "Expected an object." } };

  const out: Record<string, any> = {};
  const section = (name: string, build: (input: any) => any) => {
    if (body[name] && typeof body[name] === "object") out[name] = build(body[name]);
  };
  const list = (value: unknown, max: number, build: (entry: any) => any) =>
    Array.isArray(value) ? value.slice(0, max).map(build) : [];

  section("profile", input => ({
    name: text(input.name, 80),
    email: text(input.email, 200).toLowerCase(),
    github: text(input.github, 300),
    linkedin: text(input.linkedin, 300),
    college: text(input.college, 300),
  }));
  section("hero", input => ({
    eyebrow: text(input.eyebrow, 120), headline: text(input.headline, 200), headlineAccent: text(input.headlineAccent, 120),
    intro: text(input.intro, 600), foot: text(input.foot, 120),
    primaryCta: text(input.primaryCta, 60), secondaryCta: text(input.secondaryCta, 60),
  }));
  section("work", input => ({
    label: text(input.label, 80), heading: text(input.heading, 120), headingAccent: text(input.headingAccent, 120),
    intro: text(input.intro, 600), note: text(input.note, 600),
  }));
  section("skills", input => ({
    label: text(input.label, 80), heading: text(input.heading, 120), headingAccent: text(input.headingAccent, 120),
    intro: text(input.intro, 600), note: text(input.note, 600),
  }));
  section("about", input => ({
    label: text(input.label, 80), heading: text(input.heading, 160), headingAccent: text(input.headingAccent, 160),
    workingLabel: text(input.workingLabel, 120),
    steps: list(input.steps, 8, step => ({ number: text(step?.number, 8), title: text(step?.title, 120), text: text(step?.text, 400) })),
    paragraphs: list(input.paragraphs, 8, paragraph => text(paragraph, 1200)).filter(Boolean),
    notes: list(input.notes, 8, note => ({ icon: text(note?.icon, 40) || "sparkles", text: text(note?.text, 80) })),
  }));
  section("journey", input => ({
    label: text(input.label, 80), heading: text(input.heading, 120), headingAccent: text(input.headingAccent, 120),
    intro: text(input.intro, 400),
    steps: list(input.steps, 10, step => ({ label: text(step?.label, 80), title: text(step?.title, 160), text: text(step?.text, 800), badge: text(step?.badge, 40) })),
  }));
  section("contact", input => ({
    label: text(input.label, 80), heading: text(input.heading, 120), headingAccent: text(input.headingAccent, 120),
    intro: text(input.intro, 400), formHeading: text(input.formHeading, 120), formIntro: text(input.formIntro, 400),
  }));
  // `focus` is a bare array rather than a section object.
  if (Array.isArray(body.focus)) out.focus = list(body.focus, 6, item => ({ icon: text(item?.icon, 40) || "code", text: text(item?.text, 80) }));
  section("footer", input => ({ note: text(input.note, 200) }));

  if (!Object.keys(out).length) return { ok: false, errors: { body: "No known sections to update." } };
  return { ok: true, value: out };
}
