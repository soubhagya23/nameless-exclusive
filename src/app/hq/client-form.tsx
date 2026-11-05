"use client";

import { useState } from "react";
import { actionSaveClient } from "./actions";
import RoundEditor from "./round-editor";
import type { RoundConfig } from "@/lib/types";

type Initial = { name?: string; first_name?: string; slug?: string; wa_number?: string; portrait_url?: string; area?: string; akshayName?: string };

export default function ClientForm({ clientId, initial, round }: { clientId: string | null; initial: Initial; round?: RoundConfig }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const fd = new FormData(e.currentTarget);
    try { await actionSaveClient(clientId, fd); } catch (ex) { const m = ex instanceof Error ? ex.message : String(ex); if (m.includes("NEXT_REDIRECT")) return; setErr(m); setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <div className="form panel">
        <h3>Who</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label>Full name<input name="name" defaultValue={initial.name || ""} required /></label>
          <label>First name (how the page addresses him)<input name="first_name" defaultValue={initial.first_name || ""} /></label>
          <label>Slug (exclusive.thenameless.studio/slug)<input name="slug" defaultValue={initial.slug || ""} required pattern="[a-z0-9-]+" /></label>
          <label>WhatsApp fallback number (digits, with country code)<input name="wa_number" defaultValue={initial.wa_number || ""} /></label>
          <label>Area line (under the portrait)<input name="area" defaultValue={initial.area || ""} placeholder="Melbourne North and West" /></label>
          <label>Who asks the questions<input name="akshayName" defaultValue={initial.akshayName || "Akshay"} /></label>
        </div>
        <label>Portrait URL (square, from the WordPress media library or anywhere public)<input name="portrait_url" defaultValue={initial.portrait_url || ""} /></label>
      </div>
      {round ? (
        <div>
          <h3 style={{ marginBottom: 10 }}>Shoot 1 questions (the handshake)</h3>
          <RoundEditor initial={round} />
        </div>
      ) : null}
      {err ? <div className="notice err">{err}</div> : null}
      <div className="actions" style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn" type="submit" disabled={busy}>{busy ? "Saving" : clientId ? "Save changes" : "Create client"}</button>
        {!clientId ? <span className="label" style={{ color: "var(--dim)" }}>Nothing goes to him until you press Send on his HQ page.</span> : null}
      </div>
    </form>
  );
}
