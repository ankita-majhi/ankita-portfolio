"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, FileText, FolderKanban, Inbox, Lock, LogOut, Wrench } from "lucide-react";
import MessagesPanel from "./messages-panel";
import ProjectsPanel from "./projects-panel";
import SkillsPanel from "./skills-panel";
import ContentPanel from "./content-panel";

// sessionStorage, not localStorage: the token is gone when the tab closes.
const KEY = "ankita-admin-token";

const TABS = [
  ["messages", "Messages", Inbox],
  ["projects", "Projects", FolderKanban],
  ["skills", "Skills", Wrench],
  ["content", "Site content", FileText],
] as const;

export default function Admin() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<string>("messages");
  const [entry, setEntry] = useState("");
  const [gateError, setGateError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setToken(sessionStorage.getItem(KEY) || "");
    setReady(true);
  }, []);

  function signOut(message = "") {
    sessionStorage.removeItem(KEY);
    setToken("");
    setEntry("");
    setGateError(message);
  }

  /** Handed to every panel: a token that stops working returns you to the gate. */
  function onUnauthorized() {
    signOut("That token is no longer accepted. Sign in again.");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = entry.trim();
    if (!candidate) return;
    setChecking(true);
    setGateError("");
    try {
      const response = await fetch("/api/contact?limit=1", { headers: { Authorization: `Bearer ${candidate}` } });
      if (response.status === 401) {
        setGateError("That token was not accepted. Check ADMIN_TOKEN in .env.local.");
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setGateError(body?.error || `Could not reach the server (${response.status}).`);
        return;
      }
      sessionStorage.setItem(KEY, candidate);
      setToken(candidate);
      setEntry("");
    } catch {
      setGateError("Could not reach the server. Is it running?");
    } finally {
      setChecking(false);
    }
  }

  // Nothing renders until sessionStorage has been read, so the gate never
  // flashes for someone who is already signed in.
  if (!ready) return <main className="admin-shell" />;

  if (!token) {
    return <main className="admin-shell admin-centered">
      <form className="admin-gate" onSubmit={signIn}>
        <span className="admin-gate-icon"><Lock size={20}/></span>
        <h1>Admin</h1>
        <p>Enter your admin token to read messages and edit the site.</p>
        <label>Admin token<input type="password" value={entry} onChange={event=>setEntry(event.target.value)} placeholder="Paste your ADMIN_TOKEN" autoComplete="off" autoFocus/></label>
        {gateError && <p className="admin-gate-error" role="alert">{gateError}</p>}
        <button className="button primary" type="submit" disabled={checking || !entry.trim()}>{checking ? "Checking…" : "Open admin"}</button>
        <a className="admin-back" href="/"><ArrowLeft size={15}/> Back to the site</a>
      </form>
    </main>;
  }

  return <main className="admin-shell">
    <nav className="atabs" aria-label="Admin sections">
      <div>
        {TABS.map(([value, label, Glyph]) => <button key={value} className={tab === value ? "active" : ""} aria-current={tab === value} onClick={()=>setTab(value)}><Glyph size={16}/> {label}</button>)}
      </div>
      <button className="admin-btn" onClick={()=>signOut()}><LogOut size={15}/> Sign out</button>
    </nav>

    {tab === "messages" && <MessagesPanel token={token} onUnauthorized={onUnauthorized} />}
    {tab === "projects" && <ProjectsPanel token={token} onUnauthorized={onUnauthorized} />}
    {tab === "skills" && <SkillsPanel token={token} onUnauthorized={onUnauthorized} />}
    {tab === "content" && <ContentPanel token={token} onUnauthorized={onUnauthorized} />}

    <a className="admin-back" href="/"><ArrowLeft size={15}/> Back to the site</a>
  </main>;
}
