"use client";

import { useState } from "react";
import { actionResetClient } from "../actions";

/** Two taps to reset, so a stray click does nothing. */
export default function ResetButton({ clientId, slug }: { clientId: string; slug: string }) {
  const [arm, setArm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!arm) return <button className="btn small ghost" type="button" style={{ color: "var(--red)", borderColor: "var(--red)" }} onClick={() => setArm(true)}>Reset everything</button>;
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span className="label" style={{ color: "var(--red)" }}>Wipes his answers, recordings, questions and briefs.</span>
      <button className="btn small" type="button" style={{ background: "var(--red)", borderColor: "var(--red)" }} disabled={busy} onClick={async () => { setBusy(true); try { await actionResetClient(clientId, slug); } finally { setBusy(false); setArm(false); } }}>{busy ? "Resetting" : "Yes, reset"}</button>
      <button className="btn small ghost" type="button" onClick={() => setArm(false)}>Cancel</button>
    </span>
  );
}
