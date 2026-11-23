"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actionAddLink } from "./actions";

export const CATEGORY_WORDS: Record<string, string> = { raw: "Raw footage", edits: "Edits and exports", brand: "Brand and photos", docs: "Docs and briefs", other: "Other" };

export default function LinkForm({ clients, clientId, back, compact }: { clients: { id: string; name: string }[]; clientId?: string | null; back: string; compact?: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState(!compact);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const form = e.currentTarget; const fd = new FormData(form);
    try { await actionAddLink(fd); form.reset(); if (compact) setOpenForm(false); router.refresh(); } catch (ex) { setErr(ex instanceof Error ? ex.message : String(ex)); } finally { setBusy(false); }
  }
  if (!openForm) return <button className="btn small ghost" type="button" onClick={() => setOpenForm(true)}>Add a link</button>;
  return (
    <form onSubmit={onSubmit} className="form" style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="back" value={back} />
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "2fr 1fr", gap: 10 }}>
        <label>Link<input name="url" required placeholder="https://drive.google.com/drive/folders/…" inputMode="url" autoFocus={compact} /></label>
        <label>What it is<input name="title" placeholder="Shoot 1 raw footage" /></label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr 1fr" : "1fr 1fr 2fr", gap: 10 }}>
        <label>Kind<select name="category" defaultValue="raw">{Object.entries(CATEGORY_WORDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {clientId !== undefined ? <input type="hidden" name="client_id" value={clientId || ""} /> : <label>Client<select name="client_id" defaultValue=""><option value="">Agency</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        <label>Note (optional)<input name="note" placeholder="Pranshee has edit access" /></label>
      </div>
      {err ? <div className="notice err">{err}</div> : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn small" type="submit" disabled={busy}>{busy ? "Saving" : "Save link"}</button>
        {compact ? <button className="btn small ghost" type="button" onClick={() => setOpenForm(false)}>Cancel</button> : null}
      </div>
    </form>
  );
}
