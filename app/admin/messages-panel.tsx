"use client";

import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Inbox, Mail, MailOpen, RefreshCw, Trash2, Undo2 } from "lucide-react";

type Message = {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

const PAGE = 25;
const FILTERS: [string, string][] = [["all", "All"], ["new", "New"], ["read", "Read"], ["archived", "Archived"]];

function stamp(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function MessagesPanel({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [items, setItems] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    load(token, filter, 0);
  }, [token, filter]);

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    const body = await response.json().catch(() => null);
    // A token that stops working mid-session drops you back to the gate.
    if (response.status === 401) {
      onUnauthorized();
      throw new Error("unauthorized");
    }
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
    return body?.data;
  }

  async function load(active: string, status: string, skip: number) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: String(PAGE), skip: String(skip) });
      if (status !== "all") query.set("status", status);
      const response = await fetch(`/api/contact?${query}`, { headers: { Authorization: `Bearer ${active}` } });
      const body = await response.json().catch(() => null);
      if (response.status === 401) return onUnauthorized();
      if (!response.ok) throw new Error(body?.error || `Could not load messages (${response.status}).`);
      if (skip) setItems(current => [...current, ...body.data.items]);
      else setItems(body.data.items);
      setTotal(body.data.total);
      setUnread(body.data.unread);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id: string, status: Message["status"]) {
    setBusy(id);
    try {
      await request(`/api/contact/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load(token, filter, 0);
    } catch (problem) {
      if (problem instanceof Error && problem.message !== "unauthorized") setError(problem.message);
    } finally {
      setBusy("");
    }
  }

  async function remove(message: Message) {
    if (!window.confirm(`Delete the message from ${message.name}? This cannot be undone.`)) return;
    setBusy(message._id);
    try {
      await request(`/api/contact/${message._id}`, { method: "DELETE" });
      await load(token, filter, 0);
    } catch (problem) {
      if (problem instanceof Error && problem.message !== "unauthorized") setError(problem.message);
    } finally {
      setBusy("");
    }
  }


  return <>
    <header className="admin-head">
      <div className="admin-title">
        <h1><Inbox size={26}/> Inbox</h1>
        <p>{total} {total === 1 ? "message" : "messages"}{unread > 0 && <> · <b>{unread} unread</b></>}</p>
      </div>
      <div className="admin-head-actions">
        <button className="admin-btn" onClick={()=>load(token, filter, 0)} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh</button>
      </div>
    </header>

    <div className="admin-tabs" role="tablist" aria-label="Filter messages">
      {/* Clear the list and enter the loading state in the same click: otherwise
          the previous tab's messages sit under the new tab until its fetch comes
          back, and an empty list flashes "Nothing here yet" before it starts. */}
      {FILTERS.map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? "active" : ""} onClick={()=>{if(value!==filter){setItems([]);setLoading(true);setFilter(value);}}}>{label}</button>)}
    </div>

    {error && <p className="admin-error" role="alert">{error}</p>}

    {loading && !items.length && <p className="admin-empty admin-loading" role="status">Loading…</p>}

    {!loading && !items.length && !error && <div className="admin-empty">
      <p><b>Nothing here yet.</b></p>
      <p>{filter === "all" ? "Messages sent through the contact form will appear here." : `No ${filter} messages.`}</p>
    </div>}

    <ul className="admin-list">
      {items.map(message => <li key={message._id} className={`admin-msg ${message.status}`} data-busy={busy === message._id}>
        <div className="admin-msg-top">
          <div>
            <h2>{message.name}</h2>
            <a className="admin-msg-email" href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: your message${message.subject ? ` — ${message.subject}` : ""}`)}`}>{message.email}</a>
          </div>
          <div className="admin-msg-meta">
            <span className={`admin-badge ${message.status}`}>{message.status}</span>
            <time dateTime={message.createdAt}>{stamp(message.createdAt)}</time>
          </div>
        </div>
        {message.subject && <p className="admin-msg-subject">{message.subject}</p>}
        <p className="admin-msg-body">{message.message}</p>
        <div className="admin-actions">
          <a className="admin-btn primary" href={`mailto:${message.email}?subject=${encodeURIComponent("Re: your message")}&body=${encodeURIComponent(`\n\n— \nOn ${stamp(message.createdAt)}, ${message.name} wrote:\n${message.message}`)}`}><Mail size={15}/> Reply</a>
          {message.status === "new" && <button className="admin-btn" onClick={()=>changeStatus(message._id, "read")} disabled={!!busy}><MailOpen size={15}/> Mark read</button>}
          {message.status === "read" && <button className="admin-btn" onClick={()=>changeStatus(message._id, "new")} disabled={!!busy}><Undo2 size={15}/> Mark unread</button>}
          {message.status === "archived"
            ? <button className="admin-btn" onClick={()=>changeStatus(message._id, "read")} disabled={!!busy}><ArchiveRestore size={15}/> Restore</button>
            : <button className="admin-btn" onClick={()=>changeStatus(message._id, "archived")} disabled={!!busy}><Archive size={15}/> Archive</button>}
          <button className="admin-btn danger" onClick={()=>remove(message)} disabled={!!busy}><Trash2 size={15}/> Delete</button>
        </div>
      </li>)}
    </ul>

    {items.length < total && <button className="admin-more" onClick={()=>load(token, filter, items.length)} disabled={loading}>{loading ? "Loading…" : `Load ${Math.min(PAGE, total - items.length)} more`}</button>}
  </>;

}
