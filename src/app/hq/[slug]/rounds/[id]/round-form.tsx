"use client";

import { useState } from "react";
import RoundEditor from "../../../round-editor";
import { actionSaveRound, actionDeleteRound } from "../../../actions";
import type { RoundConfig } from "@/lib/types";

export default function RoundForm({ roundId, slug, title, config, status, number }: { roundId: string; slug: string; title: string; config: RoundConfig; status: string; number: number }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const fd = new FormData(e.currentTarget);
    try { await actionSaveRound(roundId, slug, fd); } catch (ex) { const m = ex instanceof Error ? ex.message : String(ex); if (m.includes("NEXT_REDIRECT")) return; setErr(m); setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <div className="form panel">
        <label>Title (internal)<input name="title" defaultValue={title} /></label>
      </div>
      <RoundEditor initial={config} />
      {err ? <div className="notice err">{err}</div> : null}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" type="submit" disabled={busy}>{busy ? "Saving" : "Save"}</button>
        <a className="btn ghost" href={`/hq/${slug}?s=${roundId}`}>Back</a>
        {status === "draft" && number > 1 ? <button className="btn link" type="button" onClick={async () => { if (!busy) { setBusy(true); try { await actionDeleteRound(roundId, slug); } catch { setBusy(false); } } }}>Delete this draft</button> : null}
      </div>
    </form>
  );
}
