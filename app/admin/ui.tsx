"use client";

import { Plus, Trash2 } from "lucide-react";
import { ICONS } from "@/lib/defaults";

/** Thrown when the token stops working, so panels can bounce back to the gate. */
export class Unauthorized extends Error {
  constructor() {
    super("unauthorized");
  }
}

/** Builds a fetch helper bound to the admin token. */
export function apiFor(token: string, onUnauthorized: () => void) {
  return async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    const body = await response.json().catch(() => null);
    if (response.status === 401) {
      onUnauthorized();
      throw new Unauthorized();
    }
    if (!response.ok) {
      const detail = body?.details ? Object.values(body.details)[0] as string : "";
      throw new Error(detail || body?.error || `Request failed (${response.status}).`);
    }
    return body?.data;
  };
}

export function Field({ label, value, onChange, hint, rows, placeholder, type = "text" }: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
  type?: string;
}) {
  return <label className="af">
    <span>{label}{hint && <small>{hint}</small>}</span>
    {rows
      ? <textarea value={value} rows={rows} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
      : <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />}
  </label>;
}

export function IconField({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return <label className="af">
    <span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)}>
      {ICONS.map(name => <option key={name} value={name}>{name}</option>)}
    </select>
  </label>;
}

/** A list of short strings, edited one per line. */
export function ListField({ label, value, onChange, hint, rows = 4 }: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  hint?: string;
  rows?: number;
}) {
  return <Field
    label={label}
    hint={hint || "One per line"}
    rows={rows}
    value={(value || []).join("\n")}
    onChange={next => onChange(next.split("\n").map(line => line.trim()).filter(Boolean))}
  />;
}

/**
 * Repeatable group of objects — the about steps, journey steps, focus items.
 * `blank` supplies a new empty entry when Add is pressed.
 */
export function Repeater<T>({ label, items, onChange, blank, render, addLabel }: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  blank: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel?: string;
}) {
  const list = items || [];
  const replace = (index: number, patch: Partial<T>) =>
    onChange(list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  const move = (index: number, by: number) => {
    const next = [...list];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return <div className="arep">
    <div className="arep-head"><h4>{label}</h4><button type="button" className="admin-btn" onClick={()=>onChange([...list, blank()])}><Plus size={14}/> {addLabel || "Add"}</button></div>
    {!list.length && <p className="arep-empty">Nothing here yet.</p>}
    {list.map((entry, index) => <div className="arep-item" key={index}>
      <div className="arep-item-head">
        <span>{index + 1}</span>
        <div>
          <button type="button" className="admin-btn" onClick={()=>move(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
          <button type="button" className="admin-btn" onClick={()=>move(index, 1)} disabled={index === list.length - 1} aria-label="Move down">↓</button>
          <button type="button" className="admin-btn danger" onClick={()=>onChange(list.filter((_, i) => i !== index))} aria-label="Remove"><Trash2 size={14}/></button>
        </div>
      </div>
      {render(entry, patch => replace(index, patch))}
    </div>)}
  </div>;
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="apanel">
    <div className="apanel-head"><h3>{title}</h3>{description && <p>{description}</p>}</div>
    {children}
  </section>;
}
