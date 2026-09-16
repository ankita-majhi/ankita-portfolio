import { Code2, Database, Terminal, Layers, Sparkles, GraduationCap, Globe2, Plus, Mail } from "lucide-react";
import { Fragment } from "react";

const ICON_MAP: Record<string, typeof Code2> = {
  code: Code2,
  database: Database,
  terminal: Terminal,
  layers: Layers,
  sparkles: Sparkles,
  graduation: GraduationCap,
  globe: Globe2,
  plus: Plus,
  mail: Mail,
};

/** Renders an icon chosen by name in the admin. Unknown names fall back to code. */
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const Glyph = ICON_MAP[name] || Code2;
  return <Glyph size={size} />;
}

/** Turns newlines in an editable field into line breaks. */
export function Lines({ text }: { text: string }) {
  const parts = (text || "").split("\n");
  return <>{parts.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>)}</>;
}

/** As Lines, but *text between asterisks* renders in italics. */
export function Rich({ text }: { text: string }) {
  const parts = (text || "").split(/(\*[^*]+\*)/g);
  return <>{parts.map((part, i) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2
      ? <em key={i}>{part.slice(1, -1)}</em>
      : <Fragment key={i}><Lines text={part} /></Fragment>
  )}</>;
}
