"use client";

import { useState } from "react";
import { actionSaveClient } from "./actions";

type Initial = { name?: string; first_name?: string; slug?: string; wa_number?: string; portrait_url?: string; config: string };

export default function ClientForm({ clientId, initial }: { clientId: string | null; initial: Initial }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState(initial.config);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { JSON.parse(config); } catch { setErr("The page config is not valid JSON. Check for a missing comma or quote."); setBusy(false); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("config", config);
    try { await actionSaveClient(clientId, fd); } catch (ex) { setErr(ex instanceof Error ? ex.message : String(ex)); setBusy(false); }
  }

  return (
    <form className="form panel" onSubmit={onSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <label>Full name<input name="name" defaultValue={initial.name || ""} required /></label>
        <label>First name (how the page addresses him)<input name="first_name" defaultValue={initial.first_name || ""} /></label>
        <label>Slug (the link: exclusive.thenameless.studio/slug)<input name="slug" defaultValue={initial.slug || ""} required pattern="[a-z0-9-]+" /></label>
        <label>WhatsApp number for the fallback (digits only, with country code)<input name="wa_number" defaultValue={initial.wa_number || ""} /></label>
      </div>
      <label>Portrait URL (square, from the WordPress media library or anywhere public)<input name="portrait_url" defaultValue={initial.portrait_url || ""} /></label>
      <label>Page config: cards, drive prompts, shoot day options
        <textarea name="config" value={config} onChange={(e) => setConfig(e.target.value)} spellCheck={false} />
      </label>
      {err ? <div className="notice err">{err}</div> : null}
      <div className="actions">
        <button className="btn" type="submit" disabled={busy}>{busy ? "Saving" : clientId ? "Save changes" : "Create client"}</button>
        <span className="label" style={{ color: "var(--dim)" }}>Cards need an id, claim and why. Prompts need q and h. shootOptions is a list of labels.</span>
      </div>
    </form>
  );
}
